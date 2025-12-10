const IMAGE_FIELD_PREFERENCE = [
  'image',
  'image_base64',
  'imageBase64',
  'image_bytes',
  'imageBytes',
  'imageData',
  'image_data',
  'imageUrl',
  'image_url',
  'page_image',
  'pageImage',
  'page_image_base64',
  'pageImageBase64',
  'page_image_url',
  'pageImageUrl',
  'page_thumbnail',
  'preview',
  'media',
  'thumbnail',
];

const IMAGE_COLLECTION_FIELDS = [
  'images',
  'image_list',
  'imageList',
  'page_images',
  'pageImages',
  'page_image_list',
  'pageImageList',
  'thumbnails',
  'preview_images',
  'previewImages',
];

const OBJECT_IMAGE_FIELDS = [
  'image',
  'img',
  'imageData',
  'image_data',
  'data',
  'value',
  'src',
  'url',
  'base64',
  'content',
  'buffer',
];

const normalizeImageValue = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
    return `data:image/png;base64,${trimmed}`;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = normalizeImageValue(entry);
      if (normalized) return normalized;
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const key of OBJECT_IMAGE_FIELDS) {
      if (!value[key]) continue;
      const normalized = normalizeImageValue(value[key]);
      if (normalized) return normalized;
    }
  }

  return null;
};

export const pickResultImageSource = (source, pageIndex = 0) => {
  if (!source || typeof source !== 'object') return null;

  for (const field of IMAGE_FIELD_PREFERENCE) {
    const normalized = normalizeImageValue(source[field]);
    if (normalized) return normalized;
  }

  for (const field of IMAGE_COLLECTION_FIELDS) {
    const collection = source[field];
    if (!collection) continue;

    if (Array.isArray(collection)) {
      if (typeof pageIndex === 'number' && collection[pageIndex]) {
        const normalized = normalizeImageValue(collection[pageIndex]);
        if (normalized) return normalized;
      }

      for (const entry of collection) {
        const normalized = normalizeImageValue(entry);
        if (normalized) return normalized;
      }
    } else if (typeof collection === 'object') {
      const directMatch = collection[pageIndex] ?? collection[String(pageIndex)];
      if (directMatch) {
        const normalized = normalizeImageValue(directMatch);
        if (normalized) return normalized;
      }
      const normalized = normalizeImageValue(Object.values(collection));
      if (normalized) return normalized;
    } else {
      const normalized = normalizeImageValue(collection);
      if (normalized) return normalized;
    }
  }

  return null;
};

export const extractBoundingPages = (data) => {
  if (!Array.isArray(data?.results)) return [];

  return data.results
    .map((result, idx) => {
      const res = result?.json?.res || {};
      const boxes = Array.isArray(res?.parsing_res_list) ? res.parsing_res_list : [];
      const imageSrc = pickResultImageSource(result, idx) || pickResultImageSource(res, idx);

      const pageSize = res?.page_size || res?.pageSize;
      const imageSize = res?.image_size || res?.imageSize;

      let pageWidth = res?.page_width || res?.pageWidth || res?.image_width || res?.width || 0;
      let pageHeight = res?.page_height || res?.pageHeight || res?.image_height || res?.height || 0;

      if ((!pageWidth || !pageHeight) && boxes.length) {
        boxes.forEach((block) => {
          if (!Array.isArray(block?.block_bbox)) return;
          pageWidth = Math.max(pageWidth, block.block_bbox[2] || 0);
          pageHeight = Math.max(pageHeight, block.block_bbox[3] || 0);
        });
      }

      if (!boxes.length && !imageSrc) {
        return null;
      }

      return {
        pageIndex: result?.markdown?.page_index ?? res?.page_index ?? idx,
        boxes,
        pageWidth: pageWidth || 1,
        pageHeight: pageHeight || 1,
        imageSrc: imageSrc || null,
      };
    })
    .filter(Boolean);
};

export const generateMarkdown = (data) => {
  if (!data) return 'No content';
  if (typeof data === 'string') return data;

  try {
    if (Array.isArray(data.results)) {
      return data.results
        .map((item) => item?.markdown?.markdown_texts || '')
        .join('\n');
    }
    return String(data);
  } catch (_err) {
    return String(data);
  }
};

export const getImageSourceFromStatus = (status) => {
  if (!status) return null;
  if (status.preview) return status.preview;
  if (status.data?.imageUrl) return status.data.imageUrl;
  if (status.data?.image) return `data:image/*;base64,${status.data.image}`;
  return null;
};
