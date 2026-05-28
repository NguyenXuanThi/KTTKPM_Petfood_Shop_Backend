const slugify = require("slugify");
const mongoose = require("mongoose");
const crypto = require("crypto");
const categoryRepository = require("../repositories/categoryRepository");
const { menuCacheTtlMs } = require("../config/env");
const { getJson, setJson, deleteByPattern } = require("../config/redis");
const { SimpleCache } = require("../utils/simpleCache");

const menuCache = new SimpleCache();
const MENU_CACHE_KEY = "categories:menu";
const REDIS_CATEGORY_LIST_KEY = "cache:categories:list";
const REDIS_CATEGORY_MENU_KEY = "cache:categories:menu";
const CATEGORY_CACHE_TTL_SECONDS = 5 * 60;

const ensureObjectId = (id, message = "Invalid category id") => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

const toSlug = (name) =>
  slugify(name || "", {
    lower: true,
    strict: true,
    trim: true,
  }) || "category";

const buildTree = (items) => {
  const nodeMap = new Map();
  const roots = [];

  for (const item of items) {
    nodeMap.set(String(item._id), {
      ...item,
      id: item._id,
      children: [],
    });
  }

  for (const item of items) {
    const node = nodeMap.get(String(item._id));

    if (item.parentId && nodeMap.has(String(item.parentId))) {
      nodeMap.get(String(item.parentId)).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sorter = (a, b) => {
    if (a.menuOrder !== b.menuOrder) {
      return a.menuOrder - b.menuOrder;
    }
    return a.name.localeCompare(b.name);
  };

  const sortRecursive = (nodes) => {
    nodes.sort(sorter);
    for (const node of nodes) {
      sortRecursive(node.children);
    }
  };

  sortRecursive(roots);

  return roots;
};

const addMenuGrouping = (nodes) =>
  nodes.map((node) => {
    const groupedMap = new Map();

    const children = addMenuGrouping(node.children || []);

    for (const child of children) {
      const groupName = child.menuGroup || "Others";
      if (!groupedMap.has(groupName)) {
        groupedMap.set(groupName, []);
      }
      groupedMap.get(groupName).push(child);
    }

    const menuGroups = Array.from(groupedMap.entries()).map(([group, items]) => ({
      group,
      items,
    }));

    menuGroups.sort((a, b) => a.group.localeCompare(b.group));

    return {
      ...node,
      children,
      menuGroups,
    };
  });

const buildUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let index = 1;

  while (true) {
    const existing = await categoryRepository.findOneBySlug(slug, excludeId);
    if (!existing) return slug;
    slug = `${baseSlug}-${index}`;
    index += 1;
  }
};

const resolveParent = async (parentId, currentCategory = null) => {
  if (!parentId) return null;

  ensureObjectId(parentId, "Invalid parent category id");

  if (currentCategory && String(currentCategory._id) === String(parentId)) {
    const error = new Error("Category cannot be parent of itself");
    error.statusCode = 400;
    throw error;
  }

  const parent = await categoryRepository.findById(parentId);

  if (!parent || !parent.isActive) {
    const error = new Error("Parent category not found");
    error.statusCode = 404;
    throw error;
  }

  if (currentCategory && parent.path.startsWith(`${currentCategory.path}/`)) {
    const error = new Error("Circular hierarchy is not allowed");
    error.statusCode = 400;
    throw error;
  }

  return parent;
};

const stableHash = (value) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify(value || {}))
    .digest("hex");

const categoryListCacheKey = (query) => {
  if (!query || Object.keys(query).length === 0) return REDIS_CATEGORY_LIST_KEY;
  return `${REDIS_CATEGORY_LIST_KEY}:${stableHash(query)}`;
};

const invalidateCache = async () => {
  menuCache.delete(MENU_CACHE_KEY);
  await deleteByPattern("cache:categories:*");
};

const toDto = (doc) => {
  if (!doc) return null;
  const object = doc.toObject ? doc.toObject() : doc;

  return {
    id: object._id,
    name: object.name,
    slug: object.slug,
    parentId: object.parentId,
    level: object.level,
    path: object.path,
    menuGroup: object.menuGroup,
    menuOrder: object.menuOrder,
    isActive: object.isActive,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
  };
};

const listCategories = async (query) => {
  const cacheKey = categoryListCacheKey(query);
  const cached = await getJson(cacheKey);
  if (cached) return cached;

  const data = await categoryRepository.listFlat(query);
  const result = {
    items: data.items.map(toDto),
    meta: data.meta,
  };

  await setJson(cacheKey, result, CATEGORY_CACHE_TTL_SECONDS);
  return result;
};

const getCategoryTree = async () => {
  const items = await categoryRepository.findActive();
  return buildTree(items);
};

const getMenuTree = async () => {
  const cached = menuCache.get(MENU_CACHE_KEY);
  if (cached) return cached;

  const redisCached = await getJson(REDIS_CATEGORY_MENU_KEY);
  if (redisCached) {
    menuCache.set(MENU_CACHE_KEY, redisCached, menuCacheTtlMs);
    return redisCached;
  }

  const tree = await getCategoryTree();
  const menu = addMenuGrouping(tree);

  menuCache.set(MENU_CACHE_KEY, menu, menuCacheTtlMs);
  await setJson(REDIS_CATEGORY_MENU_KEY, menu, CATEGORY_CACHE_TTL_SECONDS);

  return menu;
};

const getCategoryById = async (id) => {
  ensureObjectId(id);

  const category = await categoryRepository.findById(id);

  if (!category || !category.isActive) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  return toDto(category);
};

const getCategoryBySlug = async (slug) => {
  const category = await categoryRepository.findBySlug(slug);

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  return toDto(category);
};

const createCategory = async (payload) => {
  const parent = await resolveParent(payload.parentId);
  const baseSlug = toSlug(payload.name);
  const uniqueSlug = await buildUniqueSlug(baseSlug);
  const level = parent ? parent.level + 1 : 0;
  const path = parent ? `${parent.path}/${uniqueSlug}` : uniqueSlug;

  const category = await categoryRepository.create({
    name: payload.name,
    slug: uniqueSlug,
    parentId: parent ? parent._id : null,
    level,
    path,
    menuGroup: payload.menuGroup || "",
    menuOrder: payload.menuOrder ?? 0,
    isActive: payload.isActive ?? true,
  });

  await invalidateCache();

  return toDto(category);
};

const updateDescendantsPath = async ({ currentCategory, updatedCategory, newLevel }) => {
  const descendants = await categoryRepository.findDescendantsByPathPrefix(currentCategory.path);

  if (!descendants.length) return;

  const operations = descendants.map((item) => {
    const suffix = item.path.slice(currentCategory.path.length);
    const levelOffset = item.level - currentCategory.level;

    return {
      updateOne: {
        filter: { _id: item._id },
        update: {
          $set: {
            path: `${updatedCategory.path}${suffix}`,
            level: newLevel + levelOffset,
          },
        },
      },
    };
  });

  await categoryRepository.bulkWrite(operations);
};

const updateCategory = async (id, payload) => {
  ensureObjectId(id);

  const currentCategory = await categoryRepository.findById(id);

  if (!currentCategory) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  const parentChanged = payload.parentId !== undefined && String(payload.parentId || "") !== String(currentCategory.parentId || "");

  const parent = parentChanged
    ? await resolveParent(payload.parentId, currentCategory)
    : payload.parentId === undefined
      ? currentCategory.parentId
        ? await categoryRepository.findById(currentCategory.parentId)
        : null
      : null;

  const shouldRebuildSlug = payload.name !== undefined;

  const slug = shouldRebuildSlug
    ? await buildUniqueSlug(toSlug(payload.name), currentCategory._id)
    : currentCategory.slug;

  const nextLevel = parent ? parent.level + 1 : 0;
  const nextPath = parent ? `${parent.path}/${slug}` : slug;

  const updatedCategory = await categoryRepository.updateById(
    id,
    {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.menuGroup !== undefined ? { menuGroup: payload.menuGroup || "" } : {}),
      ...(payload.menuOrder !== undefined ? { menuOrder: payload.menuOrder } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      ...(payload.parentId !== undefined ? { parentId: parent ? parent._id : null } : {}),
      slug,
      level: nextLevel,
      path: nextPath,
    },
    { new: true }
  );

  if (currentCategory.path !== updatedCategory.path || currentCategory.level !== updatedCategory.level) {
    await updateDescendantsPath({
      currentCategory,
      updatedCategory,
      newLevel: nextLevel,
    });
  }

  await invalidateCache();

  return toDto(updatedCategory);
};

const softDeleteCategory = async (id) => {
  ensureObjectId(id);

  const category = await categoryRepository.softDeleteById(id);

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  await invalidateCache();

  return toDto(category);
};

module.exports = {
  listCategories,
  getCategoryTree,
  getMenuTree,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  softDeleteCategory,
};
