import * as ImagePicker from 'expo-image-picker';

export type ImageResult = {
uri: string;
base64: string;
fileName: string;
mimeType: string;
};

/**
* Pick an image from gallery or camera and return base64
*/
export async function pickImage(): Promise<ImageResult | null> {
try {
// Request permissions
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
throw new Error('Camera/gallery permission denied');
}

// Pick image with base64 included directly
const result = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ImagePicker.MediaTypeOptions.Images,
allowsEditing: true,
aspect: [1, 1], // Square logo
quality: 0.8,
base64: true,
});

if (result.canceled) {
return null;
}

const asset = result.assets[0];
const uri = asset.uri;
const base64 = asset.base64 || '';

// Get file name from URI
const fileName = uri.split('/').pop() || 'logo.png';

return {
uri,
base64,
fileName,
mimeType: asset.mimeType || 'image/png',
};
} catch (error) {
console.error('Image picker error:', error);
throw error;
}
}

/**
* Upload image to Convex storage via mutation
*/
export async function uploadLogoToStorage(base64: string): Promise<string> {
// This would need a Convex mutation that handles storage
// For now, we'll use a data URL (temporary) or upload to external storage
// The mutation will handle the actual storage
return `data:image/png;base64,${base64}`;
}