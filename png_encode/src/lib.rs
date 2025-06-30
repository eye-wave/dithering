use png::{BitDepth, ColorType, Encoder};
use std::{collections::HashMap, io::Cursor};
use wasm_bindgen::prelude::*;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub fn export_png(width: u32, height: u32, pixels: &[u8]) -> Result<Vec<u8>, String> {
    let mut buffer = Vec::new();

    {
        let cursor = Cursor::new(&mut buffer);
        let (indexed_pixels, palette) = rgba_to_indexed(pixels)?;

        let mut encoder = Encoder::new(cursor, width, height);
        encoder.set_color(ColorType::Indexed);
        encoder.set_depth(BitDepth::Eight);
        encoder.set_palette(palette.clone());

        let mut writer = encoder.write_header().unwrap();

        writer.write_image_data(&indexed_pixels).unwrap();
    }

    Ok(buffer)
}

fn rgba_to_indexed(rgba: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
    let mut palette: Vec<[u8; 3]> = Vec::new();
    let mut color_map: HashMap<[u8; 3], u8> = HashMap::new();
    let mut indexed_pixels = Vec::with_capacity(rgba.len() / 4);

    for chunk in rgba.chunks(4) {
        let rgb = [chunk[0], chunk[1], chunk[2]];

        if let Some(&idx) = color_map.get(&rgb) {
            indexed_pixels.push(idx);
        } else {
            if palette.len() >= 256 {
                return Err("Palette too big, max 256 colors".to_string());
            }
            let idx = palette.len() as u8;
            palette.push(rgb);
            color_map.insert(rgb, idx);
            indexed_pixels.push(idx);
        }
    }

    let flat_palette: Vec<u8> = palette.iter().flat_map(|rgb| rgb.iter().copied()).collect();
    Ok((indexed_pixels, flat_palette))
}
