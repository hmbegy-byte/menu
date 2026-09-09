import test from 'node:test';
import assert from 'node:assert/strict';
import { brandText } from '../src/lib/brandContrast.mjs';
test('brand labels choose contrasting foreground for light and dark colors',()=>{
 assert.equal(brandText('#ffffff'),'#000000');
 assert.equal(brandText('#000000'),'#ffffff');
 assert.equal(brandText('#70452f'),'#ffffff');
 assert.equal(brandText('#ffff00'),'#000000');
});
