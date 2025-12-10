let pdfModulePromise;

const polyfillPromiseWithResolvers = () => {
  if (typeof Promise.withResolvers === 'function') {
    return;
  }

  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
};

export const loadPdfModule = async () => {
  if (pdfModulePromise) {
    return pdfModulePromise;
  }

  pdfModulePromise = (async () => {
    polyfillPromiseWithResolvers();

    const [pdfModule, workerModule] = await Promise.all([
      import('pdfjs-dist/build/pdf'),
      import('pdfjs-dist/build/pdf.worker?url'),
    ]);

    const { GlobalWorkerOptions, getDocument } = pdfModule;
    const workerSrc = workerModule?.default || workerModule;

    GlobalWorkerOptions.workerSrc = workerSrc;

    return { GlobalWorkerOptions, getDocument };
  })();

  return pdfModulePromise;
};
