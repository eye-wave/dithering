import wasmUrl from '../../png_encode/pkg/png_encode_bg.wasm?url';
import { initSync, export_png as savePng } from '../../png_encode/pkg/png_encode';

let initialized = false;

/**
 *
 * @param {WebGLRenderingContext} gl
 * @param {string} name
 * @param {"png" | "jpeg" | "webp"} format
 * @returns
 */
export async function saveCanvasAsImage(gl, name, format = 'png') {
	const { canvas } = gl;
	const pixels = new Uint8Array(canvas.width * canvas.height * 4);
	gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	flipPixels(pixels, canvas.width, canvas.height);
	let objectURL;

	if (format === 'png') {
		if (!initialized) {
			const module = await fetch(wasmUrl).then((res) => res.arrayBuffer());
			initSync({ module });
		}

		const blob = new Blob([savePng(canvas.width, canvas.height, pixels)]);
		objectURL = URL.createObjectURL(blob);
	} else {
		const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
		const ctx = offscreen.getContext('2d');
		if (!ctx) return;

		const pix = new Uint8ClampedArray(pixels.buffer);
		const img = new ImageData(pix, canvas.width, canvas.height, { colorSpace: 'srgb' });
		ctx.putImageData(img, 0, 0);

		const blob = await offscreen.convertToBlob({ quality: 1, type: 'image/' + format });
		objectURL = URL.createObjectURL(blob);
	}

	const link = document.createElement('a');
	link.download = `${name}.${format}`;
	link.href = objectURL;
	link.click();
	link.remove();

	URL.revokeObjectURL(objectURL);
}

/**
 * @param {Uint8Array} data
 * @param {number} width
 * @param {number} height
 */
export function flipPixels(data, width, height) {
	const rowSize = width * 4;
	for (let y = 0; y < height / 2; y++) {
		const topOffset = y * rowSize;
		const bottomOffset = (height - 1 - y) * rowSize;
		for (let x = 0; x < rowSize; x++) {
			const tmp = data[topOffset + x];
			data[topOffset + x] = data[bottomOffset + x];
			data[bottomOffset + x] = tmp;
		}
	}
}

/**
 * Reads & Loads an image file into an HTMLImageElement that has been fully loaded
 * @param {File} file The image file to load
 * @returns {Promise<HTMLImageElement>} A promise that resolves to the loaded image
 */
export function loadImageFile(file) {
	return new Promise((resolve, reject) => {
		if (!file.type.startsWith('image/')) {
			reject(new Error('Not an image file'));
		}

		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result !== 'string') return;

			const new_image = new Image();
			new_image.onload = () => {
				resolve(new_image);
			};

			new_image.onerror = (e) => {
				reject(e);
			};

			new_image.src = reader.result;
		};
		reader.onerror = (e) => {
			reject(e);
		};

		reader.readAsDataURL(file);
	});
}

/**
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export async function loadImage(src) {
	return new Promise((resolve, reject) => {
		const new_image = new Image();
		new_image.onload = () => {
			resolve(new_image);
		};

		new_image.onerror = (e) => {
			reject(e);
		};

		new_image.src = src;
	});
}

/**
 *
 * @param {HTMLImageElement} image
 * @returns {ImageData}
 */
export function Image2ImageData(image) {
	const canvas = new OffscreenCanvas(image.width, image.height);
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not get canvas context');

	ctx.drawImage(image, 0, 0);
	return ctx.getImageData(0, 0, image.width, image.height);
}

/**
 * @typedef {[number, number]} Vec2
 * @typedef {[number, number, number]} Vec3
 * @typedef {[number, number, number]} RGB
 * @typedef {[number, number, number]} HSL
 */

/**
 *
 * @param {string} hex
 * @returns {RGB}
 */
export function hexToRGB(hex) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);

	return [r, g, b];
}

/**
 * @param {RGB} _
 * @returns  {HSL}
 */
export function rgbToHsl([r, g, b]) {
	((r /= 255), (g /= 255), (b /= 255));
	var max = Math.max(r, g, b),
		min = Math.min(r, g, b);

	let avg = (max + min) / 2;

	let h = avg,
		s = avg,
		l = avg;

	if (max == min) {
		h = s = 0; // achromatic
	} else {
		let d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}

	return [h, s, l];
}

/**
 *
 * @param {HSL} _
 * @returns {RGB}
 */
export function hslToRgb([h, s, l]) {
	let r, g, b;

	if (s == 0) {
		r = g = b = l; // achromatic
	} else {
		/**
		 * @param {number} p
		 * @param {number} q
		 * @param {number} t
		 */
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		var p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return [r * 255, g * 255, b * 255];
}
