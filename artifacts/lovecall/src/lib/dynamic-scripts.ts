export const loadScript = (src: string, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.async = true;
    
    script.onload = () => resolve();
    script.onerror = () => {
      document.head.removeChild(script);
      reject(new Error(`Failed to load script: ${src}`));
    };
    
    document.head.appendChild(script);
  });
};

export const loadARLibraries = async () => {
  try {
    await Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'three-js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js', 'mediapipe-camera'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js', 'mediapipe-hands'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js', 'mediapipe-face')
    ]);
  } catch (error) {
    console.error('Error loading AR libraries:', error);
    throw error;
  }
};

export const loadAudioLibraries = async () => {
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.3/howler.min.js', 'howler-js');
  } catch (error) {
    console.error('Error loading Audio libraries:', error);
    throw error;
  }
};
