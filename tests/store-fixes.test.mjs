import test from 'node:test';
import assert from 'node:assert/strict';
import {isOpenAt} from '../src/lib/workingHours.mjs';
import {discountedPrice} from '../src/lib/offers.mjs';
test('overnight hours belong to the previous day after midnight',()=>{
 const hours=[{id:6,isOpen:true,from:'18:00',to:'02:00'},{id:0,isOpen:false,from:'12:00',to:'23:00'}];
 assert.equal(isOpenAt(hours,0,60),true);assert.equal(isOpenAt(hours,0,120),false);assert.equal(isOpenAt(hours,6,60),false);assert.equal(isOpenAt(hours,6,1200),true);
});
test('offers use the best active eligible discount, never add percentages',()=>{
 const offers=[{active:true,discount_percentage:10},{active:true,product_id:'a',discount_percentage:20},{active:false,discount_percentage:100},{active:true,product_id:'b',discount_percentage:80}];
 assert.equal(discountedPrice({id:'a',price:25},offers),20);assert.equal(discountedPrice({id:'c',price:25},offers),22.5);
});
