'use strict';

var x = ['a','b','c'];

for (var y in x) {
  console.log(y);
}

x.forEach(function(y) {
  console.log(y);
});