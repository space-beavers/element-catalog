(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var settings = window.Polymer || {};
var parts = location.search.slice(1).split('&');
for (var i = 0, o; i < parts.length && (o = parts[i]); i++) {
o = o.split('=');
o[0] && (settings[o[0]] = o[1] || true);
}
settings.wantShadow = settings.dom === 'shadow';
settings.hasShadow = Boolean(Element.prototype.createShadowRoot);
settings.nativeShadow = settings.hasShadow && !window.ShadowDOMPolyfill;
settings.useShadow = settings.wantShadow && settings.hasShadow;
settings.hasNativeImports = Boolean('import' in document.createElement('link'));
settings.useNativeImports = settings.hasNativeImports;
settings.useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
settings.useNativeShadow = settings.useShadow && settings.nativeShadow;
settings.usePolyfillProto = !settings.useNativeCustomElements && !Object.__proto__;
return settings;
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
for (var i = 0; i < this._callbacks.length; i++) {
this._callbacks[i]();
}
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
},
_afterNextRenderQueue: [],
_waitingNextRender: false,
afterNextRender: function (element, fn, args) {
this._watchNextRender();
this._afterNextRenderQueue.push([
element,
fn,
args
]);
},
_watchNextRender: function () {
if (!this._waitingNextRender) {
this._waitingNextRender = true;
var fn = function () {
Polymer.RenderStatus._flushNextRender();
};
if (!this._ready) {
this.whenReady(fn);
} else {
requestAnimationFrame(fn);
}
}
},
_flushNextRender: function () {
var self = this;
setTimeout(function () {
self._flushRenderCallbacks(self._afterNextRenderQueue);
self._afterNextRenderQueue = [];
self._waitingNextRender = false;
});
},
_flushRenderCallbacks: function (callbacks) {
for (var i = 0, h; i < callbacks.length; i++) {
h = callbacks[i];
h[1].apply(h[0], h[2] || Polymer.nar);
}
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
(function () {
'use strict';
var settings = Polymer.Settings;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
if (!settings.lazyRegister) {
this.ensureRegisterFinished();
}
},
createdCallback: function () {
if (!this.__hasRegisterFinished) {
this._ensureRegisterFinished(this.__proto__);
}
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
ensureRegisterFinished: function () {
this._ensureRegisterFinished(this);
},
_ensureRegisterFinished: function (proto) {
if (proto.__hasRegisterFinished !== proto.is) {
proto.__hasRegisterFinished = proto.is;
if (proto._finishRegisterFeatures) {
proto._finishRegisterFeatures();
}
proto._doBehavior('registered');
}
},
attachedCallback: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
self.isAttached = true;
self._doBehavior('attached');
});
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name, oldValue, newValue) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', [
name,
oldValue,
newValue
]);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
var n$ = Object.getOwnPropertyNames(api);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
this.copyOwnProperty(n, api, prototype);
}
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
}());
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDomModulesUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDomModulesUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument || document;
var modules = doc.querySelectorAll('dom-module');
for (var i = modules.length - 1, m; i >= 0 && (m = modules[i]); i--) {
if (m.__upgraded__) {
return;
} else {
CustomElements.upgrade(m);
}
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
var behaviorSet = [];
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
var b = behaviors[i];
if (behaviorSet.indexOf(b) === -1) {
this._mixinBehavior(b);
behaviorSet.unshift(b);
}
}
return behaviorSet;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
for (var i = 0; i < behaviors.length; i++) {
var b = behaviors[i];
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}
return flat;
},
_mixinBehavior: function (b) {
var n$ = Object.getOwnPropertyNames(b);
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
if (!Polymer.Base._behaviorProperties[n] && !this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
}
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
for (var i = 0; i < this.behaviors.length; i++) {
this._invokeBehavior(this.behaviors[i], name, args);
}
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
for (var i = 0; i < this.behaviors.length; i++) {
this._marshalBehavior(this.behaviors[i]);
}
this._marshalBehavior(this);
}
});
Polymer.Base._behaviorProperties = {
hostAttributes: true,
beforeRegister: true,
registered: true,
properties: true,
observers: true,
listeners: true,
created: true,
attached: true,
detached: true,
attributeChanged: true,
ready: true
};
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
for (var i = 0; i < this.behaviors.length; i++) {
info = this._getPropertyInfo(property, this.behaviors[i].properties);
if (info) {
return info;
}
}
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
},
_prepPropertyInfo: function () {
this._propertyInfo = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._addPropertyInfo(this._propertyInfo, this.behaviors[i].properties);
}
this._addPropertyInfo(this._propertyInfo, this.properties);
this._addPropertyInfo(this._propertyInfo, this._propertyEffects);
},
_addPropertyInfo: function (target, source) {
if (source) {
var t, s;
for (var i in source) {
t = target[i];
s = source[i];
if (i[0] === '_' && !s.readOnly) {
continue;
}
if (!target[i]) {
target[i] = {
type: typeof s === 'function' ? s : s.type,
readOnly: s.readOnly,
attribute: Polymer.CaseMap.camelToDashCase(i)
};
} else {
if (!t.type) {
t.type = s.type;
}
if (!t.readOnly) {
t.readOnly = s.readOnly;
}
}
}
}
}
});
Polymer.CaseMap = {
_caseMap: {},
_rx: {
dashToCamel: /-[a-z]/g,
camelToDash: /([A-Z])/g
},
dashToCamelCase: function (dash) {
return this._caseMap[dash] || (this._caseMap[dash] = dash.indexOf('-') < 0 ? dash : dash.replace(this._rx.dashToCamel, function (m) {
return m[1].toUpperCase();
}));
},
camelToDashCase: function (camel) {
return this._caseMap[camel] || (this._caseMap[camel] = camel.replace(this._rx.camelToDash, '-$1').toLowerCase());
}
};
Polymer.Base._addFeature({
_addHostAttributes: function (attributes) {
if (!this._aggregatedAttributes) {
this._aggregatedAttributes = {};
}
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
if (this._aggregatedAttributes) {
this._applyAttributes(this, this._aggregatedAttributes);
}
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
var v = attr$[n];
this.serializeValueToAttribute(v, n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
if (this.hasAttributes()) {
for (var i in this._propertyInfo) {
var info = this._propertyInfo[i];
if (this.hasAttribute(info.attribute)) {
this._setAttributeToProperty(model, info.attribute, i, info);
}
}
}
},
_setAttributeToProperty: function (model, attribute, property, info) {
if (!this._serializing) {
property = property || Polymer.CaseMap.dashToCamelCase(attribute);
info = info || this._propertyInfo && this._propertyInfo[property];
if (info && !info.readOnly) {
var v = this.getAttribute(attribute);
model[property] = this.deserialize(v, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (property, attribute, value) {
this._serializing = true;
value = value === undefined ? this[property] : value;
this.serializeValueToAttribute(value, attribute || Polymer.CaseMap.camelToDashCase(property));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
node = node || this;
if (str === undefined) {
node.removeAttribute(attribute);
} else {
node.setAttribute(attribute, str);
}
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value != null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value.toString();
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.version = '1.4.0';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
if (this._template === undefined) {
this._template = Polymer.DomModule.import(this.is, 'template');
}
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
HTMLTemplateElement.decorate(this._template);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_registerHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._clients = null;
this._clientsReadied = false;
},
_beginHosting: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_endHosting: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
this._readied = false;
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
if (this._template) {
this._setupRoot();
this._readyClients();
}
this._clientsReadied = true;
this._clients = null;
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
if (c$) {
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
}
this._finishDistribute();
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (i = 1; i < rowCount; i++) {
for (j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
(function () {
'use strict';
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeAppendChild = Element.prototype.appendChild;
var nativeRemoveChild = Element.prototype.removeChild;
Polymer.TreeApi = {
arrayCopyChildNodes: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstChild; n; n = n.nextSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopyChildren: function (parent) {
var copy = [], i = 0;
for (var n = parent.firstElementChild; n; n = n.nextElementSibling) {
copy[i++] = n;
}
return copy;
},
arrayCopy: function (a$) {
var l = a$.length;
var copy = new Array(l);
for (var i = 0; i < l; i++) {
copy[i] = a$[i];
}
return copy;
}
};
Polymer.TreeApi.Logical = {
hasParentNode: function (node) {
return Boolean(node.__dom && node.__dom.parentNode);
},
hasChildNodes: function (node) {
return Boolean(node.__dom && node.__dom.childNodes !== undefined);
},
getChildNodes: function (node) {
return this.hasChildNodes(node) ? this._getChildNodes(node) : node.childNodes;
},
_getChildNodes: function (node) {
if (!node.__dom.childNodes) {
node.__dom.childNodes = [];
for (var n = node.__dom.firstChild; n; n = n.__dom.nextSibling) {
node.__dom.childNodes.push(n);
}
}
return node.__dom.childNodes;
},
getParentNode: function (node) {
return node.__dom && node.__dom.parentNode !== undefined ? node.__dom.parentNode : node.parentNode;
},
getFirstChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? node.__dom.firstChild : node.firstChild;
},
getLastChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? node.__dom.lastChild : node.lastChild;
},
getNextSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? node.__dom.nextSibling : node.nextSibling;
},
getPreviousSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? node.__dom.previousSibling : node.previousSibling;
},
getFirstElementChild: function (node) {
return node.__dom && node.__dom.firstChild !== undefined ? this._getFirstElementChild(node) : node.firstElementChild;
},
_getFirstElementChild: function (node) {
var n = node.__dom.firstChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getLastElementChild: function (node) {
return node.__dom && node.__dom.lastChild !== undefined ? this._getLastElementChild(node) : node.lastElementChild;
},
_getLastElementChild: function (node) {
var n = node.__dom.lastChild;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
getNextElementSibling: function (node) {
return node.__dom && node.__dom.nextSibling !== undefined ? this._getNextElementSibling(node) : node.nextElementSibling;
},
_getNextElementSibling: function (node) {
var n = node.__dom.nextSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.nextSibling;
}
return n;
},
getPreviousElementSibling: function (node) {
return node.__dom && node.__dom.previousSibling !== undefined ? this._getPreviousElementSibling(node) : node.previousElementSibling;
},
_getPreviousElementSibling: function (node) {
var n = node.__dom.previousSibling;
while (n && n.nodeType !== Node.ELEMENT_NODE) {
n = n.__dom.previousSibling;
}
return n;
},
saveChildNodes: function (node) {
if (!this.hasChildNodes(node)) {
node.__dom = node.__dom || {};
node.__dom.firstChild = node.firstChild;
node.__dom.lastChild = node.lastChild;
node.__dom.childNodes = [];
for (var n = node.firstChild; n; n = n.nextSibling) {
n.__dom = n.__dom || {};
n.__dom.parentNode = node;
node.__dom.childNodes.push(n);
n.__dom.nextSibling = n.nextSibling;
n.__dom.previousSibling = n.previousSibling;
}
}
},
recordInsertBefore: function (node, container, ref_node) {
container.__dom.childNodes = null;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
for (var n = node.firstChild; n; n = n.nextSibling) {
this._linkNode(n, container, ref_node);
}
} else {
this._linkNode(node, container, ref_node);
}
},
_linkNode: function (node, container, ref_node) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (ref_node) {
ref_node.__dom = ref_node.__dom || {};
}
node.__dom.previousSibling = ref_node ? ref_node.__dom.previousSibling : container.__dom.lastChild;
if (node.__dom.previousSibling) {
node.__dom.previousSibling.__dom.nextSibling = node;
}
node.__dom.nextSibling = ref_node;
if (node.__dom.nextSibling) {
node.__dom.nextSibling.__dom.previousSibling = node;
}
node.__dom.parentNode = container;
if (ref_node) {
if (ref_node === container.__dom.firstChild) {
container.__dom.firstChild = node;
}
} else {
container.__dom.lastChild = node;
if (!container.__dom.firstChild) {
container.__dom.firstChild = node;
}
}
container.__dom.childNodes = null;
},
recordRemoveChild: function (node, container) {
node.__dom = node.__dom || {};
container.__dom = container.__dom || {};
if (node === container.__dom.firstChild) {
container.__dom.firstChild = node.__dom.nextSibling;
}
if (node === container.__dom.lastChild) {
container.__dom.lastChild = node.__dom.previousSibling;
}
var p = node.__dom.previousSibling;
var n = node.__dom.nextSibling;
if (p) {
p.__dom.nextSibling = n;
}
if (n) {
n.__dom.previousSibling = p;
}
node.__dom.parentNode = node.__dom.previousSibling = node.__dom.nextSibling = undefined;
container.__dom.childNodes = null;
}
};
Polymer.TreeApi.Composed = {
getChildNodes: function (node) {
return Polymer.TreeApi.arrayCopyChildNodes(node);
},
getParentNode: function (node) {
return node.parentNode;
},
clearChildNodes: function (node) {
node.textContent = '';
},
insertBefore: function (parentNode, newChild, refChild) {
return nativeInsertBefore.call(parentNode, newChild, refChild || null);
},
appendChild: function (parentNode, newChild) {
return nativeAppendChild.call(parentNode, newChild);
},
removeChild: function (parentNode, node) {
return nativeRemoveChild.call(parentNode, node);
}
};
}());
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = function (node) {
this.node = needsToWrap ? DomApi.wrap(node) : node;
};
var needsToWrap = Settings.hasShadow && !Settings.nativeShadow;
DomApi.wrap = window.wrap ? window.wrap : function (node) {
return node;
};
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
deepContains: function (node) {
if (this.node.contains(node)) {
return true;
}
var n = node;
var doc = node.ownerDocument;
while (n && n !== doc && n !== this.node) {
n = Polymer.dom(n).parentNode || n.host;
}
return n === this.node;
},
queryDistributedElements: function (selector) {
var c$ = this.getEffectiveChildNodes();
var list = [];
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE && DomApi.matchesSelector.call(c, selector)) {
list.push(c);
}
}
return list;
},
getEffectiveChildNodes: function () {
var list = [];
var c$ = this.childNodes;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
var d$ = dom(c).getDistributedNodes();
for (var j = 0; j < d$.length; j++) {
list.push(d$[j]);
}
} else {
list.push(c);
}
}
return list;
},
observeNodes: function (callback) {
if (callback) {
if (!this.observer) {
this.observer = this.node.localName === CONTENT ? new DomApi.DistributedNodesObserver(this) : new DomApi.EffectiveNodesObserver(this);
}
return this.observer.addListener(callback);
}
},
unobserveNodes: function (handle) {
if (this.observer) {
this.observer.removeListener(handle);
}
},
notifyObserver: function () {
if (this.observer) {
this.observer.notify();
}
},
_query: function (matcher, node, halter) {
node = node || this.node;
var list = [];
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
return list;
},
_queryElements: function (elements, matcher, halter, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
if (this._queryElement(c, matcher, halter, list)) {
return true;
}
}
}
},
_queryElement: function (node, matcher, halter, list) {
var result = matcher(node);
if (result) {
list.push(node);
}
if (halter && halter(result)) {
return result;
}
this._queryElements(TreeApi.Logical.getChildNodes(node), matcher, halter, list);
}
};
var CONTENT = DomApi.CONTENT = 'content';
var dom = DomApi.factory = function (node) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi.ctor(node);
}
return node.__domApi;
};
DomApi.hasApi = function (node) {
return Boolean(node.__domApi);
};
DomApi.ctor = DomApi;
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return DomApi.factory(obj, patch);
}
};
var p = Element.prototype;
DomApi.matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return DomApi;
}();
(function () {
'use strict';
var Settings = Polymer.Settings;
var DomApi = Polymer.DomApi;
var dom = DomApi.factory;
var TreeApi = Polymer.TreeApi;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var CONTENT = DomApi.CONTENT;
if (Settings.useShadow) {
return;
}
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
Polymer.Base.extend(DomApi.prototype, {
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this.insertBefore(node);
},
insertBefore: function (node, ref_node) {
if (ref_node && TreeApi.Logical.getParentNode(ref_node) !== this.node) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
if (DomApi.hasApi(parent)) {
dom(parent).notifyObserver();
}
this._removeNode(node);
} else {
this._removeOwnerShadyRoot(node);
}
}
if (!this._addNode(node, ref_node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (ref_node) {
TreeApi.Composed.insertBefore(container, node, ref_node);
} else {
TreeApi.Composed.appendChild(container, node);
}
}
this.notifyObserver();
return node;
},
_addNode: function (node, ref_node) {
var root = this.getOwnerRoot();
if (root) {
var ipAdded = this._maybeAddInsertionPoint(node, this.node);
if (!root._invalidInsertionPoints) {
root._invalidInsertionPoints = ipAdded;
}
this._addNodeToHost(root.host, node);
}
if (TreeApi.Logical.hasChildNodes(this.node)) {
TreeApi.Logical.recordInsertBefore(node, this.node, ref_node);
}
var handled = this._maybeDistribute(node) || this.node.shadyRoot;
if (handled) {
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
while (node.firstChild) {
TreeApi.Composed.removeChild(node, node.firstChild);
}
} else {
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
return handled;
},
removeChild: function (node) {
if (TreeApi.Logical.getParentNode(node) !== this.node) {
throw Error('The node to be removed is not a child of this node: ' + node);
}
if (!this._removeNode(node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
var parent = TreeApi.Composed.getParentNode(node);
if (container === parent) {
TreeApi.Composed.removeChild(container, node);
}
}
this.notifyObserver();
return node;
},
_removeNode: function (node) {
var logicalParent = TreeApi.Logical.hasParentNode(node) && TreeApi.Logical.getParentNode(node);
var distributed;
var root = this._ownerShadyRootForNode(node);
if (logicalParent) {
distributed = dom(node)._maybeDistributeParent();
TreeApi.Logical.recordRemoveChild(node, logicalParent);
if (root && this._removeDistributedChildren(root, node)) {
root._invalidInsertionPoints = true;
this._lazyDistribute(root.host);
}
}
this._removeOwnerShadyRoot(node);
if (root) {
this._removeNodeFromHost(root.host, node);
}
return distributed;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
var root = node._ownerShadyRoot;
if (root === undefined) {
if (node._isShadyRoot) {
root = node;
} else {
var parent = TreeApi.Logical.getParentNode(node);
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
if (root || document.documentElement.contains(node)) {
node._ownerShadyRoot = root;
}
}
return root;
},
_maybeDistribute: function (node) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && TreeApi.Logical.getParentNode(fragContent).nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this.getOwnerRoot();
if (root) {
this._lazyDistribute(root.host);
}
}
var needsDist = this._nodeNeedsDistribution(this.node);
if (needsDist) {
this._lazyDistribute(this.node);
}
return needsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = dom(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = TreeApi.Logical.getParentNode(n);
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
TreeApi.Logical.saveChildNodes(parent);
TreeApi.Logical.saveChildNodes(node);
added = true;
}
return added;
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = dom(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(TreeApi.Logical.getParentNode(c));
}
},
_nodeNeedsDistribution: function (node) {
return node && node.shadyRoot && DomApi.hasInsertionPoint(node.shadyRoot);
},
_addNodeToHost: function (host, node) {
if (host._elementAdd) {
host._elementAdd(node);
}
},
_removeNodeFromHost: function (host, node) {
if (host._elementRemove) {
host._elementRemove(node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = dom(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = TreeApi.Composed.getParentNode(node);
if (parent) {
TreeApi.Composed.removeChild(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = TreeApi.Logical.getParentNode(node);
}
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = TreeApi.Logical.getChildNodes(node);
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = dom(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = dom(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
var result = this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node, function (n) {
return Boolean(n);
})[0];
return result || null;
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return DomApi.matchesSelector.call(n, selector);
}, this.node);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._maybeDistributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._maybeDistributeParent();
},
_maybeDistributeParent: function () {
if (this._nodeNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
return true;
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = TreeApi.Logical.getChildNodes(externalNode);
var d = dom(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = dom(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
},
_getComposedInnerHTML: function () {
return getInnerHTML(this.node, true);
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var active = document.activeElement;
if (!active) {
return null;
}
var isShadyRoot = !!this.node._isShadyRoot;
if (this.node !== document) {
if (!isShadyRoot) {
return null;
}
if (this.node.host === active || !this.node.host.contains(active)) {
return null;
}
}
var activeRoot = dom(active).getOwnerRoot();
while (activeRoot && activeRoot !== this.node) {
active = activeRoot.host;
activeRoot = dom(active).getOwnerRoot();
}
if (this.node === document) {
return activeRoot ? null : active;
} else {
return activeRoot === this.node ? active : null;
}
},
configurable: true
},
childNodes: {
get: function () {
var c$ = TreeApi.Logical.getChildNodes(this.node);
return Array.isArray(c$) ? c$ : TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
if (TreeApi.Logical.hasChildNodes(this.node)) {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
} else {
return TreeApi.arrayCopyChildren(this.node);
}
},
configurable: true
},
parentNode: {
get: function () {
return TreeApi.Logical.getParentNode(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return TreeApi.Logical.getFirstChild(this.node);
},
configurable: true
},
lastChild: {
get: function () {
return TreeApi.Logical.getLastChild(this.node);
},
configurable: true
},
nextSibling: {
get: function () {
return TreeApi.Logical.getNextSibling(this.node);
},
configurable: true
},
previousSibling: {
get: function () {
return TreeApi.Logical.getPreviousSibling(this.node);
},
configurable: true
},
firstElementChild: {
get: function () {
return TreeApi.Logical.getFirstElementChild(this.node);
},
configurable: true
},
lastElementChild: {
get: function () {
return TreeApi.Logical.getLastElementChild(this.node);
},
configurable: true
},
nextElementSibling: {
get: function () {
return TreeApi.Logical.getNextElementSibling(this.node);
},
configurable: true
},
previousElementSibling: {
get: function () {
return TreeApi.Logical.getPreviousElementSibling(this.node);
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = TreeApi.arrayCopyChildNodes(d);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.hasInsertionPoint = function (root) {
return Boolean(root && root._insertionPoints.length);
};
}());
(function () {
'use strict';
var Settings = Polymer.Settings;
var TreeApi = Polymer.TreeApi;
var DomApi = Polymer.DomApi;
if (!Settings.useShadow) {
return;
}
Polymer.Base.extend(DomApi.prototype, {
querySelectorAll: function (selector) {
return TreeApi.arrayCopy(this.node.querySelectorAll(selector));
},
getOwnerRoot: function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
},
getDestinationInsertionPoints: function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? TreeApi.arrayCopy(n$) : [];
},
getDistributedNodes: function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? TreeApi.arrayCopy(n$) : [];
}
});
Object.defineProperties(DomApi.prototype, {
activeElement: {
get: function () {
var node = DomApi.wrap(this.node);
var activeElement = node.activeElement;
return node.contains(activeElement) ? activeElement : null;
},
configurable: true
},
childNodes: {
get: function () {
return TreeApi.arrayCopyChildNodes(this.node);
},
configurable: true
},
children: {
get: function () {
return TreeApi.arrayCopyChildren(this.node);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardMethods = function (m$) {
for (var i = 0; i < m$.length; i++) {
forwardMethod(m$[i]);
}
};
var forwardMethod = function (method) {
DomApi.prototype[method] = function () {
return this.node[method].apply(this.node, arguments);
};
};
forwardMethods([
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild',
'setAttribute',
'removeAttribute',
'querySelector'
]);
var forwardProperties = function (f$) {
for (var i = 0; i < f$.length; i++) {
forwardProperty(f$[i]);
}
};
var forwardProperty = function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
};
forwardProperties([
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
]);
}());
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_staticFlushList: [],
_finishDebouncer: null,
flush: function () {
this._flushGuard = 0;
this._prepareFlush();
while (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
while (this._debouncers.length) {
this._debouncers.shift().complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._prepareFlush();
this._flushGuard++;
}
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
},
_prepareFlush: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
for (var i = 0; i < this._staticFlushList.length; i++) {
this._staticFlushList[i]();
}
},
addStaticFlush: function (fn) {
this._staticFlushList.push(fn);
},
removeStaticFlush: function (fn) {
var i = this._staticFlushList.indexOf(fn);
if (i >= 0) {
this._staticFlushList.splice(i, 1);
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
Polymer.EventApi = function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.Event = function (event) {
this.event = event;
};
if (Settings.useShadow) {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
var path = this.event.path;
if (!Array.isArray(path)) {
path = Array.prototype.slice.call(path);
}
return path;
}
};
} else {
DomApi.Event.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var current = this.rootTarget;
while (current) {
path.push(current);
var insertionPoints = Polymer.dom(current).getDestinationInsertionPoints();
if (insertionPoints.length) {
for (var i = 0; i < insertionPoints.length - 1; i++) {
path.push(insertionPoints[i]);
}
current = insertionPoints[insertionPoints.length - 1];
} else {
current = Polymer.dom(current).parentNode || current.host;
}
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new DomApi.Event(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var useShadow = Polymer.Settings.useShadow;
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this._distributeParent();
},
_distributeParent: function () {
if (!useShadow) {
this.domApi._maybeDistributeParent();
}
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.EffectiveNodesObserver = function (domApi) {
this.domApi = domApi;
this.node = this.domApi.node;
this._listeners = [];
};
DomApi.EffectiveNodesObserver.prototype = {
addListener: function (callback) {
if (!this._isSetup) {
this._setup();
this._isSetup = true;
}
var listener = {
fn: callback,
_nodes: []
};
this._listeners.push(listener);
this._scheduleNotify();
return listener;
},
removeListener: function (handle) {
var i = this._listeners.indexOf(handle);
if (i >= 0) {
this._listeners.splice(i, 1);
handle._nodes = [];
}
if (!this._hasListeners()) {
this._cleanup();
this._isSetup = false;
}
},
_setup: function () {
this._observeContentElements(this.domApi.childNodes);
},
_cleanup: function () {
this._unobserveContentElements(this.domApi.childNodes);
},
_hasListeners: function () {
return Boolean(this._listeners.length);
},
_scheduleNotify: function () {
if (this._debouncer) {
this._debouncer.stop();
}
this._debouncer = Polymer.Debounce(this._debouncer, this._notify);
this._debouncer.context = this;
Polymer.dom.addDebouncer(this._debouncer);
},
notify: function () {
if (this._hasListeners()) {
this._scheduleNotify();
}
},
_notify: function () {
this._beforeCallListeners();
this._callListeners();
},
_beforeCallListeners: function () {
this._updateContentElements();
},
_updateContentElements: function () {
this._observeContentElements(this.domApi.childNodes);
},
_observeContentElements: function (elements) {
for (var i = 0, n; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
n.__observeNodesMap = n.__observeNodesMap || new WeakMap();
if (!n.__observeNodesMap.has(this)) {
n.__observeNodesMap.set(this, this._observeContent(n));
}
}
}
},
_observeContent: function (content) {
var self = this;
var h = Polymer.dom(content).observeNodes(function () {
self._scheduleNotify();
});
h._avoidChangeCalculation = true;
return h;
},
_unobserveContentElements: function (elements) {
for (var i = 0, n, h; i < elements.length && (n = elements[i]); i++) {
if (this._isContent(n)) {
h = n.__observeNodesMap.get(this);
if (h) {
Polymer.dom(n).unobserveNodes(h);
n.__observeNodesMap.delete(this);
}
}
}
},
_isContent: function (node) {
return node.localName === 'content';
},
_callListeners: function () {
var o$ = this._listeners;
var nodes = this._getEffectiveNodes();
for (var i = 0, o; i < o$.length && (o = o$[i]); i++) {
var info = this._generateListenerInfo(o, nodes);
if (info || o._alwaysNotify) {
this._callListener(o, info);
}
}
},
_getEffectiveNodes: function () {
return this.domApi.getEffectiveChildNodes();
},
_generateListenerInfo: function (listener, newNodes) {
if (listener._avoidChangeCalculation) {
return true;
}
var oldNodes = listener._nodes;
var info = {
target: this.node,
addedNodes: [],
removedNodes: []
};
var splices = Polymer.ArraySplice.calculateSplices(newNodes, oldNodes);
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
info.removedNodes.push(n);
}
}
for (i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (j = s.index; j < s.index + s.addedCount; j++) {
info.addedNodes.push(newNodes[j]);
}
}
listener._nodes = newNodes;
if (info.addedNodes.length || info.removedNodes.length) {
return info;
}
},
_callListener: function (listener, info) {
return listener.fn.call(this.node, info);
},
enableShadowAttributeTracking: function () {
}
};
if (Settings.useShadow) {
var baseSetup = DomApi.EffectiveNodesObserver.prototype._setup;
var baseCleanup = DomApi.EffectiveNodesObserver.prototype._cleanup;
Polymer.Base.extend(DomApi.EffectiveNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var self = this;
this._mutationHandler = function (mxns) {
if (mxns && mxns.length) {
self._scheduleNotify();
}
};
this._observer = new MutationObserver(this._mutationHandler);
this._boundFlush = function () {
self._flush();
};
Polymer.dom.addStaticFlush(this._boundFlush);
this._observer.observe(this.node, { childList: true });
}
baseSetup.call(this);
},
_cleanup: function () {
this._observer.disconnect();
this._observer = null;
this._mutationHandler = null;
Polymer.dom.removeStaticFlush(this._boundFlush);
baseCleanup.call(this);
},
_flush: function () {
if (this._observer) {
this._mutationHandler(this._observer.takeRecords());
}
},
enableShadowAttributeTracking: function () {
if (this._observer) {
this._makeContentListenersAlwaysNotify();
this._observer.disconnect();
this._observer.observe(this.node, {
childList: true,
attributes: true,
subtree: true
});
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host && Polymer.dom(host).observer) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
},
_makeContentListenersAlwaysNotify: function () {
for (var i = 0, h; i < this._listeners.length; i++) {
h = this._listeners[i];
h._alwaysNotify = h._isContentListener;
}
}
});
}
}());
(function () {
'use strict';
var DomApi = Polymer.DomApi.ctor;
var Settings = Polymer.Settings;
DomApi.DistributedNodesObserver = function (domApi) {
DomApi.EffectiveNodesObserver.call(this, domApi);
};
DomApi.DistributedNodesObserver.prototype = Object.create(DomApi.EffectiveNodesObserver.prototype);
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
},
_cleanup: function () {
},
_beforeCallListeners: function () {
},
_getEffectiveNodes: function () {
return this.domApi.getDistributedNodes();
}
});
if (Settings.useShadow) {
Polymer.Base.extend(DomApi.DistributedNodesObserver.prototype, {
_setup: function () {
if (!this._observer) {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
var self = this;
this._observer = Polymer.dom(host).observeNodes(function () {
self._scheduleNotify();
});
this._observer._isContentListener = true;
if (this._hasAttrSelect()) {
Polymer.dom(host).observer.enableShadowAttributeTracking();
}
}
}
},
_hasAttrSelect: function () {
var select = this.node.getAttribute('select');
return select && select.match(/[[.]+/);
},
_cleanup: function () {
var root = this.domApi.getOwnerRoot();
var host = root && root.host;
if (host) {
Polymer.dom(host).unobserveNodes(this._observer);
}
this._observer = null;
}
});
}
}());
(function () {
var DomApi = Polymer.DomApi;
var TreeApi = Polymer.TreeApi;
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_setupShady: function () {
this.shadyRoot = null;
if (!this.__domApi) {
this.__domApi = null;
}
if (!this.__dom) {
this.__dom = null;
}
if (!this._ownerShadyRoot) {
this._ownerShadyRoot = undefined;
}
},
_poolContent: function () {
if (this._useContent) {
TreeApi.Logical.saveChildNodes(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLogicalChildren(TreeApi.Logical.getChildNodes(this));
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._hasDistributed = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
TreeApi.Logical.saveChildNodes(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
TreeApi.Logical.saveChildNodes(c);
TreeApi.Logical.saveChildNodes(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
this.shadyRoot._invalidInsertionPoints = this.shadyRoot._invalidInsertionPoints || updateInsertionPoints;
var host = getTopDistributingHost(this);
Polymer.dom(this)._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
if (this.shadyRoot._invalidInsertionPoints) {
Polymer.dom(this)._updateInsertionPoints(this);
this.shadyRoot._invalidInsertionPoints = false;
}
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && DomApi.hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (DomApi.hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
notifyContentObservers(this.shadyRoot);
} else {
if (!this.shadyRoot._hasDistributed) {
TreeApi.Composed.clearChildNodes(this);
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
if (!this.shadyRoot._hasDistributed) {
notifyInitialDistribution(this);
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return DomApi.matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = TreeApi.Logical.getChildNodes(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = TreeApi.Logical.getChildNodes(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = TreeApi.Logical.getParentNode(p);
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = TreeApi.Logical.getChildNodes(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = TreeApi.Composed.getChildNodes(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (TreeApi.Composed.getParentNode(n) === container) {
TreeApi.Composed.removeChild(container, n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
TreeApi.Composed.insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = TreeApi.Logical.getParentNode(content);
if (parent && parent.shadyRoot && DomApi.hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = TreeApi.Logical.getChildNodes(host);
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName && c.localName === 'content') {
return host.domHost;
}
}
}
function notifyContentObservers(root) {
for (var i = 0, c; i < root._insertionPoints.length; i++) {
c = root._insertionPoints[i];
if (DomApi.hasApi(c)) {
Polymer.dom(c).notifyObserver();
}
}
}
function notifyInitialDistribution(host) {
if (DomApi.hasApi(host)) {
Polymer.dom(host).notifyObserver();
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLogicalChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new window.MutationObserver(function () {
Polymer.Async._atEndOfMicrotask();
}).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
var self = this;
this.boundComplete = function () {
self.complete();
};
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return !!(debouncer && debouncer.finish);
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
this._prepPropertyInfo();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
}
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list, template.hasAttribute('strip-whitespace'));
return list;
},
_parseNodeAnnotations: function (node, list, stripWhiteSpace) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list, stripWhiteSpace);
},
_bindingRegex: function () {
var IDENT = '(?:' + '[a-zA-Z_$][\\w.:$\\-*]*' + ')';
var NUMBER = '(?:' + '[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?' + ')';
var SQUOTE_STRING = '(?:' + '\'(?:[^\'\\\\]|\\\\.)*\'' + ')';
var DQUOTE_STRING = '(?:' + '"(?:[^"\\\\]|\\\\.)*"' + ')';
var STRING = '(?:' + SQUOTE_STRING + '|' + DQUOTE_STRING + ')';
var ARGUMENT = '(?:' + IDENT + '|' + NUMBER + '|' + STRING + '\\s*' + ')';
var ARGUMENTS = '(?:' + ARGUMENT + '(?:,\\s*' + ARGUMENT + ')*' + ')';
var ARGUMENT_LIST = '(?:' + '\\(\\s*' + '(?:' + ARGUMENTS + '?' + ')' + '\\)\\s*' + ')';
var BINDING = '(' + IDENT + '\\s*' + ARGUMENT_LIST + '?' + ')';
var OPEN_BRACKET = '(\\[\\[|{{)' + '\\s*';
var CLOSE_BRACKET = '(?:]]|}})';
var NEGATE = '(?:(!)\\s*)?';
var EXPRESSION = OPEN_BRACKET + NEGATE + BINDING + CLOSE_BRACKET;
return new RegExp(EXPRESSION, 'g');
}(),
_parseBindings: function (text) {
var re = this._bindingRegex;
var parts = [];
var lastIndex = 0;
var m;
while ((m = re.exec(text)) !== null) {
if (m.index > lastIndex) {
parts.push({ literal: text.slice(lastIndex, m.index) });
}
var mode = m[1][0];
var negate = Boolean(m[2]);
var value = m[3].trim();
var customEvent, notifyEvent, colon;
if (mode == '{' && (colon = value.indexOf('::')) > 0) {
notifyEvent = value.substring(colon + 2);
value = value.substring(0, colon);
customEvent = true;
}
parts.push({
compoundIndex: parts.length,
value: value,
mode: mode,
negate: negate,
event: notifyEvent,
customEvent: customEvent
});
lastIndex = re.lastIndex;
}
if (lastIndex && lastIndex < text.length) {
var literal = text.substring(lastIndex);
if (literal) {
parts.push({ literal: literal });
}
}
if (parts.length) {
return parts;
}
},
_literalFromParts: function (parts) {
var s = '';
for (var i = 0; i < parts.length; i++) {
var literal = parts[i].literal;
s += literal || '';
}
return s;
},
_parseTextNodeAnnotation: function (node, list) {
var parts = this._parseBindings(node.textContent);
if (parts) {
node.textContent = this._literalFromParts(parts) || ' ';
var annote = {
bindings: [{
kind: 'text',
name: 'textContent',
parts: parts,
isCompound: parts.length !== 1
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list, stripWhiteSpace) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list, stripWhiteSpace);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, stripWhiteSpace) {
if (root.firstChild) {
var node = root.firstChild;
var i = 0;
while (node) {
var next = node.nextSibling;
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = next;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
next = n.nextSibling;
root.removeChild(n);
n = next;
}
if (stripWhiteSpace && !node.textContent.trim()) {
root.removeChild(node);
i--;
}
}
if (node.parentNode) {
var childAnnotation = this._parseNodeAnnotations(node, list, stripWhiteSpace);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
node = next;
i++;
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
var attrs = Array.prototype.slice.call(node.attributes);
for (var i = attrs.length - 1, a; a = attrs[i]; i--) {
var n = a.name;
var v = a.value;
var b;
if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else if (b = this._parseNodeAttributeAnnotation(node, n, v)) {
annotation.bindings.push(b);
} else if (n === 'id') {
annotation.id = v;
}
}
},
_parseNodeAttributeAnnotation: function (node, name, value) {
var parts = this._parseBindings(value);
if (parts) {
var origName = name;
var kind = 'property';
if (name[name.length - 1] == '$') {
name = name.slice(0, -1);
kind = 'attribute';
}
var literal = this._literalFromParts(parts);
if (literal && kind == 'attribute') {
node.setAttribute(name, literal);
}
if (node.localName === 'input' && origName === 'value') {
node.setAttribute(origName, '');
}
node.removeAttribute(origName);
var propertyName = Polymer.CaseMap.dashToCamelCase(name);
if (kind === 'property') {
name = propertyName;
}
return {
kind: kind,
name: name,
propertyName: propertyName,
parts: parts,
literal: literal,
isCompound: parts.length !== 1
};
}
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
if (parent) {
for (var n = parent.firstChild, i = 0; n; n = n.nextSibling) {
if (annote.index === i++) {
return n;
}
}
} else {
return root;
}
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
var self = this;
Polymer.Annotations.prepElement = function (element) {
self._prepElement(element);
};
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
this._processAnnotations(this._notes);
}
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
for (var k = 0; k < b.parts.length; k++) {
var p = b.parts[k];
if (!p.literal) {
var signature = this._parseMethod(p.value);
if (signature) {
p.signature = signature;
} else {
p.model = this._modelForPath(p.value);
}
}
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
name: '_parent_' + prop,
parts: [{
mode: '{',
model: prop,
value: prop
}]
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
for (var i = 0, n; i < notes.length && (n = notes[i]); i++) {
for (var j = 0, b$ = n.bindings, b; j < b$.length && (b = b$[j]); j++) {
for (var k = 0, p$ = b.parts, p; k < p$.length && (p = p$[k]); k++) {
if (p.signature) {
var args = p.signature.args;
for (var kk = 0; kk < args.length; kk++) {
var model = args[kk].model;
if (model) {
pp[model] = true;
}
}
} else {
if (p.model) {
pp[p.model] = true;
}
}
}
}
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
}
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
var notes = this._notes;
var nodes = this._nodes;
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
var node = nodes[i];
this._configureTemplateContent(note, node);
this._configureCompoundBindings(note, node);
}
},
_configureTemplateContent: function (note, node) {
if (note.templateContent) {
node._content = note.templateContent;
}
},
_configureCompoundBindings: function (note, node) {
var bindings = note.bindings;
for (var i = 0; i < bindings.length; i++) {
var binding = bindings[i];
if (binding.isCompound) {
var storage = node.__compoundStorage__ || (node.__compoundStorage__ = {});
var parts = binding.parts;
var literals = new Array(parts.length);
for (var j = 0; j < parts.length; j++) {
literals[j] = parts[j].literal;
}
var name = binding.name;
storage[name] = literals;
if (binding.literal && binding.kind == 'property') {
if (node._configValue) {
node._configValue(name, binding.literal);
} else {
node[name] = binding.literal;
}
}
}
}
},
_marshalIdNodes: function () {
this.$ = {};
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}
},
_marshalAnnotatedNodes: function () {
if (this._notes && this._notes.length) {
var r = new Array(this._notes.length);
for (var i = 0; i < this._notes.length; i++) {
r[i] = this._findAnnotatedNode(this.root, this._notes[i]);
}
this._nodes = r;
}
},
_marshalAnnotatedListeners: function () {
for (var i = 0, l = this._notes.length, a; i < l && (a = this._notes[i]); i++) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
for (var j = 0, e$ = a.events, e; j < e$.length && (e = e$[j]); j++) {
this.listen(node, e.name, e.value);
}
}
}
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, eventName;
for (eventName in listeners) {
if (eventName.indexOf('.') < 0) {
node = this;
name = eventName;
} else {
name = eventName.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[eventName]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var wrap = Polymer.DomApi.wrap;
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
stateObj.movefn = null;
stateObj.upfn = null;
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = wrap(ev.currentTarget);
var gobj = node[GESTURE_KEY];
if (!gobj) {
return;
}
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend' && !ev.__polymerSimulatedTouch) {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1 && r.reset) {
r.reset();
}
}
}
for (i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
node = wrap(node);
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: null,
upfn: null
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: function (e) {
return Gestures.prevent(e);
}
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: null,
upfn: null,
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
if (self.info.state === 'start') {
Gestures.prevent('tap');
}
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
if (this.info.state === 'start') {
Gestures.prevent('tap');
}
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_setupGestures: function () {
this.__polymerGestures = null;
},
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getEffectiveChildNodes: function () {
return Polymer.dom(this).getEffectiveChildNodes();
},
getEffectiveChildren: function () {
var list = Polymer.dom(this).getEffectiveChildNodes();
return list.filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
getEffectiveTextContent: function () {
var cn = this.getEffectiveChildNodes();
var tc = [];
for (var i = 0, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(Polymer.dom(c).textContent);
}
}
return tc.join('');
},
queryEffectiveChildren: function (slctr) {
var e$ = Polymer.dom(this).queryDistributedElements(slctr);
return e$ && e$[0];
},
queryAllEffectiveChildren: function (slctr) {
return Polymer.dom(this).queryDistributedElements(slctr);
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
detail = detail === null || detail === undefined ? {} : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var useCache = options._useCache;
var event = this._getEvent(type, bubbles, cancelable, useCache);
event.detail = detail;
if (useCache) {
this.__eventCache[type] = null;
}
node.dispatchEvent(event);
if (useCache) {
this.__eventCache[type] = event;
}
return event;
},
__eventCache: {},
_getEvent: function (type, bubbles, cancelable, useCache) {
var event = useCache && this.__eventCache[type];
if (!event || (event.bubbles != bubbles || event.cancelable != cancelable)) {
event = new Event(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable
});
}
return event;
},
async: function (callback, waitTime) {
var self = this;
return Polymer.Async.run(function () {
callback.call(self);
}, waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this._get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror, optAsync) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
optAsync = Boolean(optAsync);
if (optAsync) {
l.setAttribute('async', '');
}
var self = this;
if (onload) {
l.onload = function (e) {
return onload.call(self, e);
};
}
if (onerror) {
l.onerror = function (e) {
return onerror.call(self, e);
};
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this !== node && this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
Polymer.Bind = {
_dataEventCache: {},
prepareModel: function (model) {
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (source, event, value) {
value = value === undefined ? this[source] : value;
event = event || Polymer.CaseMap.camelToDashCase(source) + '-changed';
this.fire(event, { value: value }, {
bubbles: false,
cancelable: false,
_useCache: true
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
for (var i = 0, l = effects.length, fx; i < l && (fx = effects[i]); i++) {
fx.fn.call(this, property, value, fx.effect, old, fromAbove);
}
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
if (!model._propertyEffects) {
model._propertyEffects = {};
}
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
var propEffect = {
kind: kind,
effect: effect,
fn: Polymer.Bind['_' + kind + 'Effect']
};
fx.push(propEffect);
return propEffect;
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'annotatedComputation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event, negated) {
if (!model._bindListeners) {
model._bindListeners = [];
}
var fn = this._notedListenerFactory(property, path, this._isStructured(path), negated);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, negated) {
return function (target, value, targetPath) {
if (targetPath) {
this._notifyPath(this._fixPath(path, property, targetPath), value);
} else {
value = target[property];
if (negated) {
value = !value;
}
if (!isStructured) {
this[path] = value;
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
var b$ = inst._bindListeners;
for (var i = 0, l = b$.length, info; i < l && (info = b$[i]); i++) {
var node = inst._nodes[info.index];
this._addNotifyListener(node, inst, info.event, info.changedFn);
}
},
_addNotifyListener: function (element, context, event, changedFn) {
element.addEventListener(event, function (e) {
return context._notifyListener(changedFn, e);
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.kind != 'attribute' && effect.kind != 'text' && !effect.isCompound && effect.parts[0].mode === '{';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this._get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(effect, calc);
}
},
_reflectEffect: function (source, value, effect) {
this.reflectPropertyToAttribute(source, effect.attribute, value);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source, effect.event, value);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(this, args);
this.__setProperty(effect.name, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(effect, computedvalue);
}
} else if (effect.dynamicFn) {
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
var bailoutEarly = args.length > 1 || effect.dynamicFn;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base._get(name, model);
} else {
v = model[name];
}
if (bailoutEarly && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
var prop = Polymer.Bind.addPropertyEffect(this, property, kind, effect);
prop.pathFn = this['_' + prop.kind + 'PathEffect'];
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify', { event: Polymer.CaseMap.camelToDashCase(p) + '-changed' });
}
if (prop.reflectToAttribute) {
var attr = Polymer.CaseMap.camelToDashCase(p);
if (attr[0] === '-') {
this._warn(this._logf('_addPropertyEffects', 'Property ' + p + ' cannot be reflected to attribute ' + attr + ' because "-" is not a valid starting attribute name. Use a lowercase first letter for the property instead.'));
} else {
this._addPropertyEffect(p, 'reflect', { attribute: attr });
}
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
name: name,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'compute', {
method: sig.method,
args: sig.args,
trigger: null,
name: name,
dynamicFn: dynamicFn
});
}
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
for (var i = 0, o; i < observers.length && (o = observers[i]); i++) {
this._addComplexObserverEffect(o);
}
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
if (!sig) {
throw new Error('Malformed observer expression \'' + observer + '\'');
}
var dynamicFn = sig.dynamicFn;
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg,
dynamicFn: dynamicFn
});
}
if (dynamicFn) {
this._addPropertyEffect(sig.method, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: null,
dynamicFn: dynamicFn
});
}
},
_addAnnotationEffects: function (notes) {
for (var i = 0, note; i < notes.length && (note = notes[i]); i++) {
var b$ = note.bindings;
for (var j = 0, binding; j < b$.length && (binding = b$[j]); j++) {
this._addAnnotationEffect(binding, i);
}
}
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.parts[0].value, note.parts[0].event, note.parts[0].negate);
}
for (var i = 0; i < note.parts.length; i++) {
var part = note.parts[i];
if (part.signature) {
this._addAnnotatedComputationEffect(note, part, index);
} else if (!part.literal) {
if (note.kind === 'attribute' && note.name[0] === '-') {
this._warn(this._logf('_addAnnotationEffect', 'Cannot set attribute ' + note.name + ' because "-" is not a valid attribute starting character'));
} else {
this._addPropertyEffect(part.model, 'annotation', {
kind: note.kind,
index: index,
name: note.name,
propertyName: note.propertyName,
value: part.value,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
event: part.event,
customEvent: part.customEvent,
negate: part.negate
});
}
}
}
},
_addAnnotatedComputationEffect: function (note, part, index) {
var sig = part.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, part, null);
} else {
for (var i = 0, arg; i < sig.args.length && (arg = sig.args[i]); i++) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, part, arg);
}
}
if (sig.dynamicFn) {
this.__addAnnotatedComputationEffect(sig.method, index, note, part, null);
}
}
},
__addAnnotatedComputationEffect: function (property, index, note, part, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
isCompound: note.isCompound,
compoundIndex: part.compoundIndex,
kind: note.kind,
name: note.name,
negate: part.negate,
method: part.signature.method,
args: part.signature.args,
trigger: trigger,
dynamicFn: part.signature.dynamicFn
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+?)\(([\s\S]*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (this.getPropertyInfo(sig.method) !== Polymer.nob) {
sig.static = false;
sig.dynamicFn = true;
}
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = { name: arg };
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.model = this._modelForPath(arg);
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
if (this._bindListeners) {
Polymer.Bind.setupBindListeners(this);
}
},
_applyEffectValue: function (info, value) {
var node = this._nodes[info.index];
var property = info.name;
if (info.isCompound) {
var storage = node.__compoundStorage__[property];
storage[info.compoundIndex] = value;
value = storage.join('');
}
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
var pinfo;
if (!node._propertyInfo || !(pinfo = node._propertyInfo[property]) || !pinfo.readOnly) {
this.__setProperty(property, value, false, node);
}
}
},
_executeStaticEffects: function () {
if (this._propertyEffects && this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
(function () {
var usePolyfillProto = Polymer.Settings.usePolyfillProto;
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
this._handlers = [];
this._aboveConfig = null;
if (initialConfig) {
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
var info = this._propertyInfo[name];
if (!info || !info.readOnly) {
this._config[name] = value;
}
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
for (var i = 0; i < this.behaviors.length; i++) {
this._configureProperties(this.behaviors[i].properties, config);
}
this._configureProperties(this.properties, config);
this.mixin(config, this._aboveConfig);
this._config = config;
if (this._clients && this._clients.length) {
this._distributeConfig(this._config);
}
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (!usePolyfillProto && this.hasOwnProperty(i) && this._propertyEffects && this._propertyEffects[i]) {
config[i] = this[i];
delete this[i];
} else if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation' && !x.isCompound) {
var node = this._nodes[x.effect.index];
var name = x.effect.propertyName;
var isAttr = x.effect.kind == 'attribute';
var hasEffect = node._propertyEffects && node._propertyEffects[name];
if (node._configValue && (hasEffect || !isAttr)) {
var value = p === x.effect.value ? config[p] : this._get(x.effect.value, config);
if (isAttr) {
value = node.deserialize(this.serialize(value), node._propertyInfo[name].type);
}
node._configValue(name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!Polymer.Bind._isEventBogus(e, e.target)) {
var value, path;
if (e.detail) {
value = e.detail.value;
path = e.detail.path;
}
if (!this._clientsReadied) {
this._queueHandler([
fn,
e.target,
value,
path
]);
} else {
return fn.call(this, e.target, value, path);
}
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2], h[3]);
}
this._handlers = [];
}
});
}());
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var info = {};
this._get(path, this, info);
if (info.path) {
this._notifyPath(info.path, value, fromAbove);
}
},
_notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPathUp(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array) {
var coll = Polymer.Collection.get(array);
var old, key;
if (last[0] == '#') {
key = last;
old = coll.getItem(key);
last = array.indexOf(old);
coll.setItem(key, value);
} else if (parseInt(last, 10) == last) {
old = prop[last];
key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
}
prop[last] = value;
if (!root) {
this._notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
return this._get(path, root);
},
_get: function (path, root, info) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
for (var i = 0; i < parts.length; i++) {
if (!prop) {
return;
}
var part = parts[i];
if (array && part[0] == '#') {
prop = Polymer.Collection.get(array).getItem(part);
} else {
prop = prop[part];
if (info && array && parseInt(part, 10) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
}
array = Array.isArray(prop) ? prop : null;
}
if (info) {
info.path = parts.join('.');
}
return prop;
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects && this._propertyEffects[model];
if (fx$) {
for (var i = 0, fx; i < fx$.length && (fx = fx$[i]); i++) {
var fxFn = fx.pathFn;
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node._notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node._notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this._notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this._notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPathUp: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, {
bubbles: false,
_useCache: true
});
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
notifySplices: function (path, splices) {
var info = {};
var array = this._get(path, this, info);
this._notifySplices(array, info.path, splices);
},
_notifySplices: function (array, path, splices) {
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
if (!array.hasOwnProperty('splices')) {
Object.defineProperty(array, 'splices', {
configurable: true,
writable: true
});
}
array.splices = change;
this._notifyPath(path + '.splices', change);
this._notifyPath(path + '.length', array.length);
change.keySplices = null;
change.indexSplices = null;
},
_notifySplice: function (array, path, index, added, removed) {
this._notifySplices(array, path, [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}]);
},
push: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start) {
var info = {};
var array = this._get(path, this, info);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, info.path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var info = {};
var array = this._get(path, this, info);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, info.path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var info = {};
var array = this._get(path, this, info);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, info.path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
_getEvent: Polymer.Base._getEvent,
__eventCache: Polymer.Base.__eventCache,
notifyPath: Polymer.Base.notifyPath,
_get: Polymer.Base._get,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_notifyPathUp: Polymer.Base._notifyPathUp,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths,
_getPathParts: Polymer.Base._getPathParts
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
return {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = this._expandUnicodeEscapes(t);
t = t.replace(this._rx.multipleSpaces, ' ');
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
node.keyframesName = node.selector.split(this._rx.multipleSpaces).pop();
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
_expandUnicodeEscapes: function (s) {
return s.replace(/\\([0-9a-f]{1,6})\s/gi, function () {
var code = arguments[1], repeat = 6 - code.length;
while (repeat--) {
code = '0' + code;
}
return '\\' + code;
});
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) === 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/,
multipleSpaces: /\s+/g
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, styleRuleCallback, keyframesRuleCallback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachRule(this.rulesForStyle(s), styleRuleCallback, keyframesRuleCallback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
isKeyframesSelector: function (rule) {
return rule.parent && rule.parent.type === this.ruleTypes.KEYFRAMES_RULE;
},
forEachRule: function (node, styleRuleCallback, keyframesRuleCallback) {
if (!node) {
return;
}
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
styleRuleCallback(node);
} else if (keyframesRuleCallback && node.type === this.ruleTypes.KEYFRAMES_RULE) {
keyframesRuleCallback(node);
} else if (node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachRule(r, styleRuleCallback, keyframesRuleCallback);
}
}
},
applyCss: function (cssText, moniker, target, contextNode) {
var style = this.createScopeStyle(cssText, moniker);
target = target || document.head;
var after = contextNode && contextNode.nextSibling || target.firstChild;
this.__lastHeadApplyNode = style;
return target.insertBefore(style, after);
},
createScopeStyle: function (cssText, moniker) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
return style;
},
__lastHeadApplyNode: null,
applyStylePlaceHolder: function (moniker) {
var placeHolder = document.createComment(' Shady DOM styles for ' + moniker + ' ');
var after = this.__lastHeadApplyNode ? this.__lastHeadApplyNode.nextSibling : null;
var scope = document.head;
scope.insertBefore(placeHolder, after || scope.firstChild);
this.__lastHeadApplyNode = placeHolder;
return placeHolder;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this.cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Polymer.TreeApi.arrayCopy(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this.cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, (c ? c + ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
if (!styleUtil.isKeyframesSelector(rule)) {
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(CONTENT_START, HOST + ' $1');
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=\[])+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?::host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /::content|::shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
var CONTENT_START = new RegExp('^(' + CONTENT + ')');
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachRule(rules, function (rule) {
self._mapRuleOntoParent(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRuleOntoParent: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || [];
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (!nativeShadow) {
this._scopeStyle = styleUtil.applyStylePlaceHolder(this.is);
}
},
_prepShimStyles: function () {
if (this._template) {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow;
}
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
this._prepStyleProperties();
if (!this._needsStyleProperties() && this._styles.length) {
styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null, this._scopeStyle);
}
} else {
this._styles = [];
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
var p = this._template && this._template.parentNode;
if (this._template && (!p || p.id.toLowerCase() !== this.is)) {
cssText += styleUtil.cssFromElement(this._template);
}
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
var className = node.getAttribute('class');
node.setAttribute('class', self._scopeElementClass(node, className));
var n$ = node.querySelectorAll('*');
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
className = n.getAttribute('class');
n.setAttribute('class', self._scopeElementClass(n, className));
}
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
for (var i = 0, m; i < mxns.length && (m = mxns[i]); i++) {
if (m.addedNodes) {
for (var j = 0; j < m.addedNodes.length; j++) {
scopify(m.addedNodes[j]);
}
}
}
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {}, keyframes = [];
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
}, function onKeyframesRule(rule) {
keyframes.push(rule);
});
styles._keyframes = keyframes;
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
return this.collectConsumingCssText(rule.parsedCssText);
},
collectConsumingCssText: function (cssText) {
return cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var colon = p.indexOf(':');
if (colon !== -1) {
var pp = p.substring(colon);
pp = pp.trim();
pp = this.valueForProperty(pp, props) || pp;
p = p.substring(0, colon) + pp;
}
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
applyKeyframeTransforms: function (rule, keyframeTransforms) {
var input = rule.cssText;
var output = rule.cssText;
if (rule.hasAnimations == null) {
rule.hasAnimations = this.rx.ANIMATION_MATCH.test(input);
}
if (rule.hasAnimations) {
var transform;
if (rule.keyframeNamesToTransform == null) {
rule.keyframeNamesToTransform = [];
for (var keyframe in keyframeTransforms) {
transform = keyframeTransforms[keyframe];
output = transform(input);
if (input !== output) {
input = output;
rule.keyframeNamesToTransform.push(keyframe);
}
}
} else {
for (var i = 0; i < rule.keyframeNamesToTransform.length; ++i) {
transform = keyframeTransforms[rule.keyframeNamesToTransform[i]];
input = transform(input);
}
output = input;
}
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
var keyframeTransforms = this._elementKeyframeTransforms(element, scopeSelector);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (!nativeShadow && !Polymer.StyleUtil.isKeyframesSelector(rule) && rule.cssText) {
self.applyKeyframeTransforms(rule, keyframeTransforms);
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_elementKeyframeTransforms: function (element, scopeSelector) {
var keyframesRules = element._styles._keyframes;
var keyframeTransforms = {};
if (!nativeShadow && keyframesRules) {
for (var i = 0, keyframesRule = keyframesRules[i]; i < keyframesRules.length; keyframesRule = keyframesRules[++i]) {
this._scopeKeyframes(keyframesRule, scopeSelector);
keyframeTransforms[keyframesRule.keyframesName] = this._keyframesRuleTransformer(keyframesRule);
}
}
return keyframeTransforms;
},
_keyframesRuleTransformer: function (keyframesRule) {
return function (cssText) {
return cssText.replace(keyframesRule.keyframesNameRx, keyframesRule.transformedKeyframesName);
};
},
_scopeKeyframes: function (rule, scopeId) {
rule.keyframesNameRx = new RegExp(rule.keyframesName, 'g');
rule.transformedKeyframesName = rule.keyframesName + '-' + scopeId;
rule.transformedSelector = rule.transformedSelector || rule.selector;
rule.selector = rule.transformedSelector.replace(rule.keyframesName, rule.transformedKeyframesName);
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.getAttribute('class') || '';
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.setAttribute('class', v);
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\s}])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,()]*)|(?:[^;()]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
ANIMATION_MATCH: /(animation\s*:)|(animation-name\s*:)/,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles && this._styles.length ? propertyUtils.decorateStyles(this._styles) : null;
},
customStyle: null,
getComputedStyleValue: function (property) {
return this._styleProperties && this._styleProperties[property] || getComputedStyle(this).getPropertyValue(property);
},
_setupStyleProperties: function () {
this.customStyle = {};
this._styleCache = null;
this._styleProperties = null;
this._scopeSelector = null;
this._ownStyleProperties = null;
this._customStyle = null;
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = this.shadyRoot && this.shadyRoot._hasDistributed ? Polymer.dom(node) : node;
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector = (selector ? selector + ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepConstructor();
this._prepStyles();
},
_finishRegisterFeatures: function () {
this._prepTemplate();
this._prepShimStyles();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepPropertyInfo();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._setupGestures();
this._setupConfigure();
this._setupStyleProperties();
this._setupDebouncers();
this._setupShady();
this._registerHost();
if (this._template) {
this._poolContent();
this._beginHosting();
this._stampTemplate();
this._endHosting();
this._marshalAnnotationReferences();
}
this._marshalInstanceEffects();
this._marshalBehaviors();
this._marshalHostAttributes();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
if (b.listeners) {
this._listenListeners(b.listeners);
}
}
});
(function () {
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
_template: null,
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply(true);
} else {
var self = this;
var observer = new MutationObserver(function () {
observer.disconnect();
self._apply(true);
});
observer.observe(e, { childList: true });
}
}
}
},
_apply: function (deferProperties) {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
var self = this;
var fn = function fn() {
self._applyCustomProperties(e);
};
if (this._pendingApplyProperties) {
cancelAnimationFrame(this._pendingApplyProperties);
this._pendingApplyProperties = null;
}
if (deferProperties) {
this._pendingApplyProperties = requestAnimationFrame(fn);
} else {
fn();
}
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepPropertyInfo();
archetype._prepBindings();
archetype._notifyPathUp = this._notifyPathUpImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
archetype.__setPropertyOrig = this.__setProperty;
archetype.__setProperty = this.__setPropertyImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
__setPropertyImpl: function (property, value, fromAbove, node) {
if (node && node.__hideTemplateChildren__ && property == 'textContent') {
property = '__polymerTextContent__';
}
this.__setPropertyOrig(property, value, fromAbove, node);
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function () {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = function () {
rootDataHost._prepElement();
};
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop),
fn: Polymer.Bind._functionEffect
},
{
kind: 'notify',
fn: Polymer.Bind._notifyEffect,
effect: { event: Polymer.CaseMap.camelToDashCase(parentProp) + '-changed' }
}
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
var self = this;
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = function (source, value) {
self._forwardParentProp(source, value);
};
}
this._extendTemplate(template, proto);
template._pathEffector = function (path, value, fromAbove) {
return self._pathEffectorImpl(path, value, fromAbove);
};
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
var n$ = Object.getOwnPropertyNames(proto);
if (proto._propertySetter) {
template._propertySetter = proto._propertySetter;
}
for (var i = 0, n; i < n$.length && (n = n$[i]); i++) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
}
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathUpImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
var model = this._modelForPath(subPath);
if (model in this._parentProps) {
this._forwardParentPath(subPath, value);
}
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._registerHost(host);
this._beginHosting();
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._endHosting();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
if (model[prop] === undefined) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
_template: null,
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return '#' + key;
},
removeKey: function (key) {
if (key = this._parseKey(key)) {
this._removeFromMap(this.store[key]);
delete this.store[key];
}
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
var key;
if (item && typeof item == 'object') {
key = this.omap.get(item);
} else {
key = this.pmap[item];
}
if (key != undefined) {
return '#' + key;
}
},
getKeys: function () {
return Object.keys(this.store).map(function (key) {
return '#' + key;
});
},
_parseKey: function (key) {
if (key && key[0] == '#') {
return key.slice(1);
}
},
setItem: function (key, item) {
if (key = this._parseKey(key)) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
}
},
getItem: function (key) {
if (key = this._parseKey(key)) {
return this.store[key];
}
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
s.addedKeys = [];
for (var j = 0; j < s.removed.length; j++) {
key = this.getKey(s.removed[j]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.addedCount; j++) {
var item = this.userArray[s.index + j];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}
var removed = [];
var added = [];
for (key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
_template: null,
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number,
renderedItemCount: {
type: Number,
notify: true,
readOnly: true
},
initialCount: {
type: Number,
observer: '_initializeChunking'
},
targetFramerate: {
type: Number,
value: 20
},
_targetFrameTime: {
type: Number,
computed: '_computeFrameTime(targetFramerate)'
}
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
this._pool = [];
this._limit = Infinity;
var self = this;
this._boundRenderChunk = function () {
self._renderChunk();
};
},
detached: function () {
this.__isDetached = true;
for (var i = 0; i < this._instances.length; i++) {
this._detachInstance(i);
}
},
attached: function () {
if (this.__isDetached) {
this.__isDetached = false;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
for (var i = 0; i < this._instances.length; i++) {
this._attachInstance(i, parent);
}
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function (sort) {
var dataHost = this._getRootDataHost();
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function (filter) {
var dataHost = this._getRootDataHost();
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_computeFrameTime: function (rate) {
return Math.ceil(1000 / rate);
},
_initializeChunking: function () {
if (this.initialCount) {
this._limit = this.initialCount;
this._chunkCount = this.initialCount;
this._lastChunkTime = performance.now();
}
},
_tryRenderChunk: function () {
if (this.items && this._limit < this.items.length) {
this.debounce('renderChunk', this._requestRenderChunk);
}
},
_requestRenderChunk: function () {
requestAnimationFrame(this._boundRenderChunk);
},
_renderChunk: function () {
var currChunkTime = performance.now();
var ratio = this._targetFrameTime / (currChunkTime - this._lastChunkTime);
this._chunkCount = Math.round(this._chunkCount * ratio) || 1;
this._limit += this._chunkCount;
this._lastChunkTime = currChunkTime;
this._debounceTemplate(this._render);
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._initializeChunking();
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else if (this._keySplices.length) {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
} else {
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder && i < this._limit) {
inst = this._insertInstance(i, inst.__key__);
} else if (!inst.isPlaceholder && i >= this._limit) {
inst = this._downgradeInstance(i, inst.__key__);
}
keyToIdx[inst.__key__] = i;
if (!inst.isPlaceholder) {
inst.__setProperty(this.indexAs, i, true);
}
}
this._pool.length = 0;
this._setRenderedItemCount(this._instances.length);
this.fire('dom-change');
this._tryRenderChunk();
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
var self = this;
if (this._filterFn) {
keys = keys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
if (this._sortFn) {
keys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
}
for (i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__key__ = key;
if (!inst.isPlaceholder && i < this._limit) {
inst.__setProperty(this.as, c.getItem(key), true);
}
} else if (i < this._limit) {
this._insertInstance(i, key);
} else {
this._insertPlaceholder(i, key);
}
}
for (var j = this._instances.length - 1; j >= i; j--) {
this._detachAndRemoveInstance(j);
}
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var keyMap = {};
var key;
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
key = s.removed[j];
keyMap[key] = keyMap[key] ? null : -1;
}
for (j = 0; j < s.added.length; j++) {
key = s.added[j];
keyMap[key] = keyMap[key] ? null : 1;
}
}
var removedIdxs = [];
var addedKeys = [];
for (key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
this._detachAndRemoveInstance(idx);
}
}
}
var self = this;
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return self._filterFn(c.getItem(a));
});
}
addedKeys.sort(function (a, b) {
return self._sortFn(c.getItem(a), c.getItem(b));
});
var start = 0;
for (i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i]);
}
}
},
_insertRowUserSort: function (start, key) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = this._sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._insertPlaceholder(idx, key);
return idx;
},
_applySplicesArrayOrder: function (splices) {
for (var i = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0; j < s.removed.length; j++) {
this._detachAndRemoveInstance(s.index);
}
for (j = 0; j < s.addedKeys.length; j++) {
this._insertPlaceholder(s.index + j, s.addedKeys[j]);
}
}
},
_detachInstance: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
return inst;
}
},
_attachInstance: function (idx, parent) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
parent.insertBefore(inst.root, this);
}
},
_detachAndRemoveInstance: function (idx) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
this._instances.splice(idx, 1);
},
_insertPlaceholder: function (idx, key) {
this._instances.splice(idx, 0, {
isPlaceholder: true,
__key__: key
});
},
_stampInstance: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
return this.stamp(model);
},
_insertInstance: function (idx, key) {
var inst = this._pool.pop();
if (inst) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._stampInstance(idx, key);
}
var beforeRow = this._instances[idx + 1];
var beforeNode = beforeRow && !beforeRow.isPlaceholder ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
this._instances[idx] = inst;
return inst;
},
_downgradeInstance: function (idx, key) {
var inst = this._detachInstance(idx);
if (inst) {
this._pool.push(inst);
}
inst = {
isPlaceholder: true,
__key__: key
};
this._instances[idx] = inst;
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this._notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst.__setProperty(prop, value, true);
}
}
},
_forwardParentPath: function (path, value) {
var i$ = this._instances;
for (var i = 0, inst; i < i$.length && (inst = i$[i]); i++) {
if (!inst.isPlaceholder) {
inst._notifyPath(path, value, true);
}
}
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst && !inst.isPlaceholder) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst._notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
_template: null,
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
_template: null,
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
if (!this.parentNode || this.parentNode.nodeType == Node.DOCUMENT_FRAGMENT_NODE && (!Polymer.Settings.hasShadow || !(this.parentNode instanceof ShadowRoot))) {
this._teardownInstance();
}
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
var parentNode = Polymer.dom(this).parentNode;
if (parentNode) {
var parent = Polymer.dom(parentNode);
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
parent.insertBefore(root, this);
} else {
var c$ = this._instance._children;
if (c$ && c$.length) {
var lastChild = Polymer.dom(this).previousSibling;
if (lastChild !== c$[c$.length - 1]) {
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.insertBefore(n, this);
}
}
}
}
}
},
_teardownInstance: function () {
if (this._instance) {
var c$ = this._instance._children;
if (c$ && c$.length) {
var parent = Polymer.dom(Polymer.dom(c$[0]).parentNode);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
parent.removeChild(n);
}
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance._notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
_template: null,
created: function () {
var self = this;
Polymer.RenderStatus.whenReady(function () {
if (document.readyState == 'loading') {
document.addEventListener('DOMContentLoaded', function () {
self._markImportsReady();
});
} else {
self._markImportsReady();
}
});
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
var setupConfigure = this._setupConfigure;
this._setupConfigure = function () {
setupConfigure.call(this, config);
};
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
this._prepPropertyInfo();
Polymer.Base._initFeatures.call(this);
this._children = Polymer.TreeApi.arrayCopyChildNodes(this.root);
}
this._insertChildren();
this.fire('dom-change');
}
});
var _self = typeof window !== 'undefined' ? window : typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope ? self : {};
var Prism = function () {
var lang = /\blang(?:uage)?-(\w+)\b/i;
var uniqueId = 0;
var _ = _self.Prism = {
util: {
encode: function (tokens) {
if (tokens instanceof Token) {
return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
} else if (_.util.type(tokens) === 'Array') {
return tokens.map(_.util.encode);
} else {
return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
}
},
type: function (o) {
return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
},
objId: function (obj) {
if (!obj['__id']) {
Object.defineProperty(obj, '__id', { value: ++uniqueId });
}
return obj['__id'];
},
clone: function (o) {
var type = _.util.type(o);
switch (type) {
case 'Object':
var clone = {};
for (var key in o) {
if (o.hasOwnProperty(key)) {
clone[key] = _.util.clone(o[key]);
}
}
return clone;
case 'Array':
return o.map && o.map(function (v) {
return _.util.clone(v);
});
}
return o;
}
},
languages: {
extend: function (id, redef) {
var lang = _.util.clone(_.languages[id]);
for (var key in redef) {
lang[key] = redef[key];
}
return lang;
},
insertBefore: function (inside, before, insert, root) {
root = root || _.languages;
var grammar = root[inside];
if (arguments.length == 2) {
insert = arguments[1];
for (var newToken in insert) {
if (insert.hasOwnProperty(newToken)) {
grammar[newToken] = insert[newToken];
}
}
return grammar;
}
var ret = {};
for (var token in grammar) {
if (grammar.hasOwnProperty(token)) {
if (token == before) {
for (var newToken in insert) {
if (insert.hasOwnProperty(newToken)) {
ret[newToken] = insert[newToken];
}
}
}
ret[token] = grammar[token];
}
}
_.languages.DFS(_.languages, function (key, value) {
if (value === root[inside] && key != inside) {
this[key] = ret;
}
});
return root[inside] = ret;
},
DFS: function (o, callback, type, visited) {
visited = visited || {};
for (var i in o) {
if (o.hasOwnProperty(i)) {
callback.call(o, i, o[i], type || i);
if (_.util.type(o[i]) === 'Object' && !visited[_.util.objId(o[i])]) {
visited[_.util.objId(o[i])] = true;
_.languages.DFS(o[i], callback, null, visited);
} else if (_.util.type(o[i]) === 'Array' && !visited[_.util.objId(o[i])]) {
visited[_.util.objId(o[i])] = true;
_.languages.DFS(o[i], callback, i, visited);
}
}
}
}
},
plugins: {},
highlightAll: function (async, callback) {
var elements = document.querySelectorAll('code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code');
for (var i = 0, element; element = elements[i++];) {
_.highlightElement(element, async === true, callback);
}
},
highlightElement: function (element, async, callback) {
var language, grammar, parent = element;
while (parent && !lang.test(parent.className)) {
parent = parent.parentNode;
}
if (parent) {
language = (parent.className.match(lang) || [
,
''
])[1];
grammar = _.languages[language];
}
element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
parent = element.parentNode;
if (/pre/i.test(parent.nodeName)) {
parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
}
var code = element.textContent;
var env = {
element: element,
language: language,
grammar: grammar,
code: code
};
if (!code || !grammar) {
_.hooks.run('complete', env);
return;
}
_.hooks.run('before-highlight', env);
if (async && _self.Worker) {
var worker = new Worker(_.filename);
worker.onmessage = function (evt) {
env.highlightedCode = evt.data;
_.hooks.run('before-insert', env);
env.element.innerHTML = env.highlightedCode;
callback && callback.call(env.element);
_.hooks.run('after-highlight', env);
_.hooks.run('complete', env);
};
worker.postMessage(JSON.stringify({
language: env.language,
code: env.code,
immediateClose: true
}));
} else {
env.highlightedCode = _.highlight(env.code, env.grammar, env.language);
_.hooks.run('before-insert', env);
env.element.innerHTML = env.highlightedCode;
callback && callback.call(element);
_.hooks.run('after-highlight', env);
_.hooks.run('complete', env);
}
},
highlight: function (text, grammar, language) {
var tokens = _.tokenize(text, grammar);
return Token.stringify(_.util.encode(tokens), language);
},
tokenize: function (text, grammar, language) {
var Token = _.Token;
var strarr = [text];
var rest = grammar.rest;
if (rest) {
for (var token in rest) {
grammar[token] = rest[token];
}
delete grammar.rest;
}
tokenloop:
for (var token in grammar) {
if (!grammar.hasOwnProperty(token) || !grammar[token]) {
continue;
}
var patterns = grammar[token];
patterns = _.util.type(patterns) === 'Array' ? patterns : [patterns];
for (var j = 0; j < patterns.length; ++j) {
var pattern = patterns[j], inside = pattern.inside, lookbehind = !!pattern.lookbehind, lookbehindLength = 0, alias = pattern.alias;
pattern = pattern.pattern || pattern;
for (var i = 0; i < strarr.length; i++) {
var str = strarr[i];
if (strarr.length > text.length) {
break tokenloop;
}
if (str instanceof Token) {
continue;
}
pattern.lastIndex = 0;
var match = pattern.exec(str);
if (match) {
if (lookbehind) {
lookbehindLength = match[1].length;
}
var from = match.index - 1 + lookbehindLength, match = match[0].slice(lookbehindLength), len = match.length, to = from + len, before = str.slice(0, from + 1), after = str.slice(to + 1);
var args = [
i,
1
];
if (before) {
args.push(before);
}
var wrapped = new Token(token, inside ? _.tokenize(match, inside) : match, alias);
args.push(wrapped);
if (after) {
args.push(after);
}
Array.prototype.splice.apply(strarr, args);
}
}
}
}
return strarr;
},
hooks: {
all: {},
add: function (name, callback) {
var hooks = _.hooks.all;
hooks[name] = hooks[name] || [];
hooks[name].push(callback);
},
run: function (name, env) {
var callbacks = _.hooks.all[name];
if (!callbacks || !callbacks.length) {
return;
}
for (var i = 0, callback; callback = callbacks[i++];) {
callback(env);
}
}
}
};
var Token = _.Token = function (type, content, alias) {
this.type = type;
this.content = content;
this.alias = alias;
};
Token.stringify = function (o, language, parent) {
if (typeof o == 'string') {
return o;
}
if (_.util.type(o) === 'Array') {
return o.map(function (element) {
return Token.stringify(element, language, o);
}).join('');
}
var env = {
type: o.type,
content: Token.stringify(o.content, language, parent),
tag: 'span',
classes: [
'token',
o.type
],
attributes: {},
language: language,
parent: parent
};
if (env.type == 'comment') {
env.attributes['spellcheck'] = 'true';
}
if (o.alias) {
var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
Array.prototype.push.apply(env.classes, aliases);
}
_.hooks.run('wrap', env);
var attributes = '';
for (var name in env.attributes) {
attributes += (attributes ? ' ' : '') + name + '="' + (env.attributes[name] || '') + '"';
}
return '<' + env.tag + ' class="' + env.classes.join(' ') + '" ' + attributes + '>' + env.content + '</' + env.tag + '>';
};
if (!_self.document) {
if (!_self.addEventListener) {
return _self.Prism;
}
_self.addEventListener('message', function (evt) {
var message = JSON.parse(evt.data), lang = message.language, code = message.code, immediateClose = message.immediateClose;
_self.postMessage(_.highlight(code, _.languages[lang], lang));
if (immediateClose) {
_self.close();
}
}, false);
return _self.Prism;
}
var script = document.currentScript || [].slice.call(document.getElementsByTagName('script')).pop();
if (script) {
_.filename = script.src;
if (document.addEventListener && !script.hasAttribute('data-manual')) {
document.addEventListener('DOMContentLoaded', _.highlightAll);
}
}
return _self.Prism;
}();
if (typeof module !== 'undefined' && module.exports) {
module.exports = Prism;
}
if (typeof global !== 'undefined') {
global.Prism = Prism;
}
Prism.languages.markup = {
'comment': /\x3c!--[\w\W]*?--\x3e/,
'prolog': /<\?[\w\W]+?\?>/,
'doctype': /<!DOCTYPE[\w\W]+?>/,
'cdata': /<!\[CDATA\[[\w\W]*?]]>/i,
'tag': {
pattern: /<\/?(?!\d)[^\s>\/=.$<]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\\1|\\?(?!\1)[\w\W])*\1|[^\s'">=]+))?)*\s*\/?>/i,
inside: {
'tag': {
pattern: /^<\/?[^\s>\/]+/i,
inside: {
'punctuation': /^<\/?/,
'namespace': /^[^\s>\/:]+:/
}
},
'attr-value': {
pattern: /=(?:('|")[\w\W]*?(\1)|[^\s>]+)/i,
inside: { 'punctuation': /[=>"']/ }
},
'punctuation': /\/?>/,
'attr-name': {
pattern: /[^\s>\/]+/,
inside: { 'namespace': /^[^\s>\/:]+:/ }
}
}
},
'entity': /&#?[\da-z]{1,8};/i
};
Prism.hooks.add('wrap', function (env) {
if (env.type === 'entity') {
env.attributes['title'] = env.content.replace(/&amp;/, '&');
}
});
Prism.languages.xml = Prism.languages.markup;
Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;
Prism.languages.css = {
'comment': /\/\*[\w\W]*?\*\//,
'atrule': {
pattern: /@[\w-]+?.*?(;|(?=\s*\{))/i,
inside: { 'rule': /@[\w-]+/ }
},
'url': /url\((?:(["'])(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1|.*?)\)/i,
'selector': /[^\{\}\s][^\{\};]*?(?=\s*\{)/,
'string': /("|')(\\(?:\r\n|[\w\W])|(?!\1)[^\\\r\n])*\1/,
'property': /(\b|\B)[\w-]+(?=\s*:)/i,
'important': /\B!important\b/i,
'function': /[-a-z0-9]+(?=\()/i,
'punctuation': /[(){};:]/
};
Prism.languages.css['atrule'].inside.rest = Prism.util.clone(Prism.languages.css);
if (Prism.languages.markup) {
Prism.languages.insertBefore('markup', 'tag', {
'style': {
pattern: /(<style[\w\W]*?>)[\w\W]*?(?=<\/style>)/i,
lookbehind: true,
inside: Prism.languages.css,
alias: 'language-css'
}
});
Prism.languages.insertBefore('inside', 'attr-value', {
'style-attr': {
pattern: /\s*style=("|').*?\1/i,
inside: {
'attr-name': {
pattern: /^\s*style/i,
inside: Prism.languages.markup.tag.inside
},
'punctuation': /^\s*=\s*['"]|['"]\s*$/,
'attr-value': {
pattern: /.+/i,
inside: Prism.languages.css
}
},
alias: 'language-css'
}
}, Prism.languages.markup.tag);
}
Prism.languages.clike = {
'comment': [
{
pattern: /(^|[^\\])\/\*[\w\W]*?\*\//,
lookbehind: true
},
{
pattern: /(^|[^\\:])\/\/.*/,
lookbehind: true
}
],
'string': /(["'])(\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
'class-name': {
pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/i,
lookbehind: true,
inside: { punctuation: /(\.|\\)/ }
},
'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
'boolean': /\b(true|false)\b/,
'function': /[a-z0-9_]+(?=\()/i,
'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)\b/i,
'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
'punctuation': /[{}[\];(),.:]/
};
Prism.languages.javascript = Prism.languages.extend('clike', {
'keyword': /\b(as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/,
'number': /\b-?(0x[\dA-Fa-f]+|0b[01]+|0o[0-7]+|\d*\.?\d+([Ee][+-]?\d+)?|NaN|Infinity)\b/,
'function': /[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*(?=\()/i
});
Prism.languages.insertBefore('javascript', 'keyword', {
'regex': {
pattern: /(^|[^\/])\/(?!\/)(\[.+?]|\\.|[^\/\\\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})]))/,
lookbehind: true
}
});
Prism.languages.insertBefore('javascript', 'class-name', {
'template-string': {
pattern: /`(?:\\`|\\?[^`])*`/,
inside: {
'interpolation': {
pattern: /\$\{[^}]+\}/,
inside: {
'interpolation-punctuation': {
pattern: /^\$\{|\}$/,
alias: 'punctuation'
},
rest: Prism.languages.javascript
}
},
'string': /[\s\S]+/
}
}
});
if (Prism.languages.markup) {
Prism.languages.insertBefore('markup', 'tag', {
'script': {
pattern: /(<script[\w\W]*?>)[\w\W]*?(?=<\/script>)/i,
lookbehind: true,
inside: Prism.languages.javascript,
alias: 'language-javascript'
}
});
}
Prism.languages.js = Prism.languages.javascript;
(function () {
if (typeof self === 'undefined' || !self.Prism || !self.document || !document.querySelector) {
return;
}
self.Prism.fileHighlight = function () {
var Extensions = {
'js': 'javascript',
'html': 'markup',
'svg': 'markup',
'xml': 'markup',
'py': 'python',
'rb': 'ruby',
'ps1': 'powershell',
'psm1': 'powershell'
};
if (Array.prototype.forEach) {
Array.prototype.slice.call(document.querySelectorAll('pre[data-src]')).forEach(function (pre) {
var src = pre.getAttribute('data-src');
var language, parent = pre;
var lang = /\blang(?:uage)?-(?!\*)(\w+)\b/i;
while (parent && !lang.test(parent.className)) {
parent = parent.parentNode;
}
if (parent) {
language = (pre.className.match(lang) || [
,
''
])[1];
}
if (!language) {
var extension = (src.match(/\.(\w+)$/) || [
,
''
])[1];
language = Extensions[extension] || extension;
}
var code = document.createElement('code');
code.className = 'language-' + language;
pre.textContent = '';
code.textContent = 'Loading\u2026';
pre.appendChild(code);
var xhr = new XMLHttpRequest();
xhr.open('GET', src, true);
xhr.onreadystatechange = function () {
if (xhr.readyState == 4) {
if (xhr.status < 400 && xhr.responseText) {
code.textContent = xhr.responseText;
Prism.highlightElement(code);
} else if (xhr.status >= 400) {
code.textContent = '\u2716 Error ' + xhr.status + ' while fetching file: ' + xhr.statusText;
} else {
code.textContent = '\u2716 Error: File does not exist or is empty';
}
}
};
xhr.send(null);
});
}
};
document.addEventListener('DOMContentLoaded', self.Prism.fileHighlight);
}());
(function () {
'use strict';
var HIGHLIGHT_EVENT = 'syntax-highlight';
Polymer({
is: 'prism-highlighter',
ready: function () {
this._handler = this._highlight.bind(this);
},
attached: function () {
(this.parentElement || this.parentNode.host).addEventListener(HIGHLIGHT_EVENT, this._handler);
},
detached: function () {
(this.parentElement || this.parentNode.host).removeEventListener(HIGHLIGHT_EVENT, this._handler);
},
_highlight: function (event) {
if (!event.detail || !event.detail.code) {
console.warn('Malformed', HIGHLIGHT_EVENT, 'event:', event.detail);
return;
}
var detail = event.detail;
detail.code = Prism.highlight(detail.code, this._detectLang(detail.code, detail.lang));
},
_detectLang: function (code, lang) {
if (!lang) {
return code.match(/^\s*</) ? Prism.languages.markup : Prism.languages.javascript;
}
if (lang === 'js' || lang.substr(0, 2) === 'es') {
return Prism.languages.javascript;
} else if (lang === 'css') {
return Prism.languages.css;
} else if (lang === 'c') {
return Prism.languages.clike;
} else {
return Prism.languages.markup;
}
}
});
}());
!function () {
function t(t) {
if (!t.ctrlKey && !t.metaKey && 2 !== t.which) {
var e = this.getAttribute('href');
if (0 !== e.indexOf('http') || window.location.host === new URL(e).host) {
window.history.pushState(JSON.parse(this.getAttribute('state')), this.getAttribute('title'), e);
try {
var n = new PopStateEvent('popstate', {
bubbles: !1,
cancelable: !1,
state: window.history.state
});
'dispatchEvent_' in window ? window.dispatchEvent_(n) : window.dispatchEvent(n);
} catch (i) {
var a = document.createEvent('CustomEvent');
a.initCustomEvent('popstate', !1, !1, { state: window.history.state }), window.dispatchEvent(a);
}
t.preventDefault();
}
}
}
var e = Object.create(HTMLAnchorElement.prototype);
e.createdCallback = function () {
this.addEventListener('click', t, !1);
}, e.detachedCallback = function () {
this.removeEventListener('click', t, !1);
}, document.registerElement('pushstate-anchor', {
prototype: e,
'extends': 'a'
});
}();
Polymer({
is: 'paper-toolbar',
hostAttributes: { 'role': 'toolbar' },
properties: {
bottomJustify: {
type: String,
value: ''
},
justify: {
type: String,
value: ''
},
middleJustify: {
type: String,
value: ''
}
},
attached: function () {
this._observer = this._observe(this);
this._updateAriaLabelledBy();
},
detached: function () {
if (this._observer) {
this._observer.disconnect();
}
},
_observe: function (node) {
var observer = new MutationObserver(function () {
this._updateAriaLabelledBy();
}.bind(this));
observer.observe(node, {
childList: true,
subtree: true
});
return observer;
},
_updateAriaLabelledBy: function () {
var labelledBy = [];
var contents = Polymer.dom(this.root).querySelectorAll('content');
for (var content, index = 0; content = contents[index]; index++) {
var nodes = Polymer.dom(content).getDistributedNodes();
for (var node, jndex = 0; node = nodes[jndex]; jndex++) {
if (node.classList && node.classList.contains('title')) {
if (node.id) {
labelledBy.push(node.id);
} else {
var id = 'paper-toolbar-label-' + Math.floor(Math.random() * 10000);
node.id = id;
labelledBy.push(id);
}
}
}
}
if (labelledBy.length > 0) {
this.setAttribute('aria-labelledby', labelledBy.join(' '));
}
},
_computeBarExtraClasses: function (barJustify) {
if (!barJustify)
return '';
return barJustify + (barJustify === 'justified' ? '' : '-justified');
}
});
Polymer({
is: 'iron-media-query',
properties: {
queryMatches: {
type: Boolean,
value: false,
readOnly: true,
notify: true
},
query: {
type: String,
observer: 'queryChanged'
},
full: {
type: Boolean,
value: false
},
_boundMQHandler: {
value: function () {
return this.queryHandler.bind(this);
}
},
_mq: { value: null }
},
attached: function () {
this.style.display = 'none';
this.queryChanged();
},
detached: function () {
this._remove();
},
_add: function () {
if (this._mq) {
this._mq.addListener(this._boundMQHandler);
}
},
_remove: function () {
if (this._mq) {
this._mq.removeListener(this._boundMQHandler);
}
this._mq = null;
},
queryChanged: function () {
this._remove();
var query = this.query;
if (!query) {
return;
}
if (!this.full && query[0] !== '(') {
query = '(' + query + ')';
}
this._mq = window.matchMedia(query);
this._add();
this.queryHandler(this._mq);
},
queryHandler: function (mq) {
this._setQueryMatches(mq.matches);
}
});
Polymer.IronSelection = function (selectCallback) {
this.selection = [];
this.selectCallback = selectCallback;
};
Polymer.IronSelection.prototype = {
get: function () {
return this.multi ? this.selection.slice() : this.selection[0];
},
clear: function (excludes) {
this.selection.slice().forEach(function (item) {
if (!excludes || excludes.indexOf(item) < 0) {
this.setItemSelected(item, false);
}
}, this);
},
isSelected: function (item) {
return this.selection.indexOf(item) >= 0;
},
setItemSelected: function (item, isSelected) {
if (item != null) {
if (isSelected !== this.isSelected(item)) {
if (isSelected) {
this.selection.push(item);
} else {
var i = this.selection.indexOf(item);
if (i >= 0) {
this.selection.splice(i, 1);
}
}
if (this.selectCallback) {
this.selectCallback(item, isSelected);
}
}
}
},
select: function (item) {
if (this.multi) {
this.toggle(item);
} else if (this.get() !== item) {
this.setItemSelected(this.get(), false);
this.setItemSelected(item, true);
}
},
toggle: function (item) {
this.setItemSelected(item, !this.isSelected(item));
}
};
Polymer.IronSelectableBehavior = {
properties: {
attrForSelected: {
type: String,
value: null
},
selected: {
type: String,
notify: true
},
selectedItem: {
type: Object,
readOnly: true,
notify: true
},
activateEvent: {
type: String,
value: 'tap',
observer: '_activateEventChanged'
},
selectable: String,
selectedClass: {
type: String,
value: 'iron-selected'
},
selectedAttribute: {
type: String,
value: null
},
fallbackSelection: {
type: String,
value: null
},
items: {
type: Array,
readOnly: true,
notify: true,
value: function () {
return [];
}
},
_excludedLocalNames: {
type: Object,
value: function () {
return { 'template': 1 };
}
}
},
observers: [
'_updateAttrForSelected(attrForSelected)',
'_updateSelected(selected)',
'_checkFallback(fallbackSelection)'
],
created: function () {
this._bindFilterItem = this._filterItem.bind(this);
this._selection = new Polymer.IronSelection(this._applySelection.bind(this));
},
attached: function () {
this._observer = this._observeItems(this);
this._updateItems();
if (!this._shouldUpdateSelection) {
this._updateSelected();
}
this._addListener(this.activateEvent);
},
detached: function () {
if (this._observer) {
Polymer.dom(this).unobserveNodes(this._observer);
}
this._removeListener(this.activateEvent);
},
indexOf: function (item) {
return this.items.indexOf(item);
},
select: function (value) {
this.selected = value;
},
selectPrevious: function () {
var length = this.items.length;
var index = (Number(this._valueToIndex(this.selected)) - 1 + length) % length;
this.selected = this._indexToValue(index);
},
selectNext: function () {
var index = (Number(this._valueToIndex(this.selected)) + 1) % this.items.length;
this.selected = this._indexToValue(index);
},
forceSynchronousItemUpdate: function () {
this._updateItems();
},
get _shouldUpdateSelection() {
return this.selected != null;
},
_checkFallback: function () {
if (this._shouldUpdateSelection) {
this._updateSelected();
}
},
_addListener: function (eventName) {
this.listen(this, eventName, '_activateHandler');
},
_removeListener: function (eventName) {
this.unlisten(this, eventName, '_activateHandler');
},
_activateEventChanged: function (eventName, old) {
this._removeListener(old);
this._addListener(eventName);
},
_updateItems: function () {
var nodes = Polymer.dom(this).queryDistributedElements(this.selectable || '*');
nodes = Array.prototype.filter.call(nodes, this._bindFilterItem);
this._setItems(nodes);
},
_updateAttrForSelected: function () {
if (this._shouldUpdateSelection) {
this.selected = this._indexToValue(this.indexOf(this.selectedItem));
}
},
_updateSelected: function () {
this._selectSelected(this.selected);
},
_selectSelected: function (selected) {
this._selection.select(this._valueToItem(this.selected));
if (this.fallbackSelection && this.items.length && this._selection.get() === undefined) {
this.selected = this.fallbackSelection;
}
},
_filterItem: function (node) {
return !this._excludedLocalNames[node.localName];
},
_valueToItem: function (value) {
return value == null ? null : this.items[this._valueToIndex(value)];
},
_valueToIndex: function (value) {
if (this.attrForSelected) {
for (var i = 0, item; item = this.items[i]; i++) {
if (this._valueForItem(item) == value) {
return i;
}
}
} else {
return Number(value);
}
},
_indexToValue: function (index) {
if (this.attrForSelected) {
var item = this.items[index];
if (item) {
return this._valueForItem(item);
}
} else {
return index;
}
},
_valueForItem: function (item) {
var propValue = item[Polymer.CaseMap.dashToCamelCase(this.attrForSelected)];
return propValue != undefined ? propValue : item.getAttribute(this.attrForSelected);
},
_applySelection: function (item, isSelected) {
if (this.selectedClass) {
this.toggleClass(this.selectedClass, isSelected, item);
}
if (this.selectedAttribute) {
this.toggleAttribute(this.selectedAttribute, isSelected, item);
}
this._selectionChange();
this.fire('iron-' + (isSelected ? 'select' : 'deselect'), { item: item });
},
_selectionChange: function () {
this._setSelectedItem(this._selection.get());
},
_observeItems: function (node) {
return Polymer.dom(node).observeNodes(function (mutations) {
this._updateItems();
if (this._shouldUpdateSelection) {
this._updateSelected();
}
this.fire('iron-items-changed', mutations, {
bubbles: false,
cancelable: false
});
});
},
_activateHandler: function (e) {
var t = e.target;
var items = this.items;
while (t && t != this) {
var i = items.indexOf(t);
if (i >= 0) {
var value = this._indexToValue(i);
this._itemActivate(value, t);
return;
}
t = t.parentNode;
}
},
_itemActivate: function (value, item) {
if (!this.fire('iron-activate', {
selected: value,
item: item
}, { cancelable: true }).defaultPrevented) {
this.select(value);
}
}
};
Polymer.IronMultiSelectableBehaviorImpl = {
properties: {
multi: {
type: Boolean,
value: false,
observer: 'multiChanged'
},
selectedValues: {
type: Array,
notify: true
},
selectedItems: {
type: Array,
readOnly: true,
notify: true
}
},
observers: ['_updateSelected(selectedValues.splices)'],
select: function (value) {
if (this.multi) {
if (this.selectedValues) {
this._toggleSelected(value);
} else {
this.selectedValues = [value];
}
} else {
this.selected = value;
}
},
multiChanged: function (multi) {
this._selection.multi = multi;
},
get _shouldUpdateSelection() {
return this.selected != null || this.selectedValues != null && this.selectedValues.length;
},
_updateAttrForSelected: function () {
if (!this.multi) {
Polymer.IronSelectableBehavior._updateAttrForSelected.apply(this);
} else if (this._shouldUpdateSelection) {
this.selectedValues = this.selectedItems.map(function (selectedItem) {
return this._indexToValue(this.indexOf(selectedItem));
}, this).filter(function (unfilteredValue) {
return unfilteredValue != null;
}, this);
}
},
_updateSelected: function () {
if (this.multi) {
this._selectMulti(this.selectedValues);
} else {
this._selectSelected(this.selected);
}
},
_selectMulti: function (values) {
if (values) {
var selectedItems = this._valuesToItems(values);
this._selection.clear(selectedItems);
for (var i = 0; i < selectedItems.length; i++) {
this._selection.setItemSelected(selectedItems[i], true);
}
if (this.fallbackSelection && this.items.length && !this._selection.get().length) {
var fallback = this._valueToItem(this.fallbackSelection);
if (fallback) {
this.selectedValues = [this.fallbackSelection];
}
}
} else {
this._selection.clear();
}
},
_selectionChange: function () {
var s = this._selection.get();
if (this.multi) {
this._setSelectedItems(s);
} else {
this._setSelectedItems([s]);
this._setSelectedItem(s);
}
},
_toggleSelected: function (value) {
var i = this.selectedValues.indexOf(value);
var unselected = i < 0;
if (unselected) {
this.push('selectedValues', value);
} else {
this.splice('selectedValues', i, 1);
}
},
_valuesToItems: function (values) {
return values == null ? null : values.map(function (value) {
return this._valueToItem(value);
}, this);
}
};
Polymer.IronMultiSelectableBehavior = [
Polymer.IronSelectableBehavior,
Polymer.IronMultiSelectableBehaviorImpl
];
Polymer({
is: 'iron-selector',
behaviors: [Polymer.IronMultiSelectableBehavior]
});
Polymer.IronResizableBehavior = {
properties: {
_parentResizable: {
type: Object,
observer: '_parentResizableChanged'
},
_notifyingDescendant: {
type: Boolean,
value: false
}
},
listeners: { 'iron-request-resize-notifications': '_onIronRequestResizeNotifications' },
created: function () {
this._interestedResizables = [];
this._boundNotifyResize = this.notifyResize.bind(this);
},
attached: function () {
this.fire('iron-request-resize-notifications', null, {
node: this,
bubbles: true,
cancelable: true
});
if (!this._parentResizable) {
window.addEventListener('resize', this._boundNotifyResize);
this.notifyResize();
}
},
detached: function () {
if (this._parentResizable) {
this._parentResizable.stopResizeNotificationsFor(this);
} else {
window.removeEventListener('resize', this._boundNotifyResize);
}
this._parentResizable = null;
},
notifyResize: function () {
if (!this.isAttached) {
return;
}
this._interestedResizables.forEach(function (resizable) {
if (this.resizerShouldNotify(resizable)) {
this._notifyDescendant(resizable);
}
}, this);
this._fireResize();
},
assignParentResizable: function (parentResizable) {
this._parentResizable = parentResizable;
},
stopResizeNotificationsFor: function (target) {
var index = this._interestedResizables.indexOf(target);
if (index > -1) {
this._interestedResizables.splice(index, 1);
this.unlisten(target, 'iron-resize', '_onDescendantIronResize');
}
},
resizerShouldNotify: function (element) {
return true;
},
_onDescendantIronResize: function (event) {
if (this._notifyingDescendant) {
event.stopPropagation();
return;
}
if (!Polymer.Settings.useShadow) {
this._fireResize();
}
},
_fireResize: function () {
this.fire('iron-resize', null, {
node: this,
bubbles: false
});
},
_onIronRequestResizeNotifications: function (event) {
var target = event.path ? event.path[0] : event.target;
if (target === this) {
return;
}
if (this._interestedResizables.indexOf(target) === -1) {
this._interestedResizables.push(target);
this.listen(target, 'iron-resize', '_onDescendantIronResize');
}
target.assignParentResizable(this);
this._notifyDescendant(target);
event.stopPropagation();
},
_parentResizableChanged: function (parentResizable) {
if (parentResizable) {
window.removeEventListener('resize', this._boundNotifyResize);
}
},
_notifyDescendant: function (descendant) {
if (!this.isAttached) {
return;
}
this._notifyingDescendant = true;
descendant.notifyResize();
this._notifyingDescendant = false;
}
};
(function () {
'use strict';
var sharedPanel = null;
function classNames(obj) {
var classes = [];
for (var key in obj) {
if (obj.hasOwnProperty(key) && obj[key]) {
classes.push(key);
}
}
return classes.join(' ');
}
Polymer({
is: 'paper-drawer-panel',
behaviors: [Polymer.IronResizableBehavior],
properties: {
defaultSelected: {
type: String,
value: 'main'
},
disableEdgeSwipe: {
type: Boolean,
value: false
},
disableSwipe: {
type: Boolean,
value: false
},
dragging: {
type: Boolean,
value: false,
readOnly: true,
notify: true
},
drawerWidth: {
type: String,
value: '256px'
},
edgeSwipeSensitivity: {
type: Number,
value: 30
},
forceNarrow: {
type: Boolean,
value: false
},
hasTransform: {
type: Boolean,
value: function () {
return 'transform' in this.style;
}
},
hasWillChange: {
type: Boolean,
value: function () {
return 'willChange' in this.style;
}
},
narrow: {
reflectToAttribute: true,
type: Boolean,
value: false,
readOnly: true,
notify: true
},
peeking: {
type: Boolean,
value: false,
readOnly: true,
notify: true
},
responsiveWidth: {
type: String,
value: '600px'
},
rightDrawer: {
type: Boolean,
value: false
},
selected: {
reflectToAttribute: true,
notify: true,
type: String,
value: null
},
drawerToggleAttribute: {
type: String,
value: 'paper-drawer-toggle'
},
drawerFocusSelector: {
type: String,
value: 'a[href]:not([tabindex="-1"]),' + 'area[href]:not([tabindex="-1"]),' + 'input:not([disabled]):not([tabindex="-1"]),' + 'select:not([disabled]):not([tabindex="-1"]),' + 'textarea:not([disabled]):not([tabindex="-1"]),' + 'button:not([disabled]):not([tabindex="-1"]),' + 'iframe:not([tabindex="-1"]),' + '[tabindex]:not([tabindex="-1"]),' + '[contentEditable=true]:not([tabindex="-1"])'
},
_transition: {
type: Boolean,
value: false
}
},
listeners: {
tap: '_onTap',
track: '_onTrack',
down: '_downHandler',
up: '_upHandler',
transitionend: '_onTransitionEnd'
},
observers: [
'_forceNarrowChanged(forceNarrow, defaultSelected)',
'_toggleFocusListener(selected)'
],
ready: function () {
this._transition = true;
this._boundFocusListener = this._didFocus.bind(this);
},
togglePanel: function () {
if (this._isMainSelected()) {
this.openDrawer();
} else {
this.closeDrawer();
}
},
openDrawer: function () {
this.selected = 'drawer';
},
closeDrawer: function () {
this.selected = 'main';
},
_onTransitionEnd: function (e) {
var target = Polymer.dom(e).localTarget;
if (target !== this) {
return;
}
if (e.propertyName === 'left' || e.propertyName === 'right') {
this.notifyResize();
}
if (e.propertyName === 'transform' && this.selected === 'drawer') {
var focusedChild = this._getAutoFocusedNode();
focusedChild && focusedChild.focus();
}
},
_computeIronSelectorClass: function (narrow, transition, dragging, rightDrawer, peeking) {
return classNames({
dragging: dragging,
'narrow-layout': narrow,
'right-drawer': rightDrawer,
'left-drawer': !rightDrawer,
transition: transition,
peeking: peeking
});
},
_computeDrawerStyle: function (drawerWidth) {
return 'width:' + drawerWidth + ';';
},
_computeMainStyle: function (narrow, rightDrawer, drawerWidth) {
var style = '';
style += 'left:' + (narrow || rightDrawer ? '0' : drawerWidth) + ';';
if (rightDrawer) {
style += 'right:' + (narrow ? '' : drawerWidth) + ';';
}
return style;
},
_computeMediaQuery: function (forceNarrow, responsiveWidth) {
return forceNarrow ? '' : '(max-width: ' + responsiveWidth + ')';
},
_computeSwipeOverlayHidden: function (narrow, disableEdgeSwipe) {
return !narrow || disableEdgeSwipe;
},
_onTrack: function (event) {
if (sharedPanel && this !== sharedPanel) {
return;
}
switch (event.detail.state) {
case 'start':
this._trackStart(event);
break;
case 'track':
this._trackX(event);
break;
case 'end':
this._trackEnd(event);
break;
}
},
_responsiveChange: function (narrow) {
this._setNarrow(narrow);
this.selected = this.narrow ? this.defaultSelected : null;
this.setScrollDirection(this._swipeAllowed() ? 'y' : 'all');
this.fire('paper-responsive-change', { narrow: this.narrow });
},
_onQueryMatchesChanged: function (event) {
this._responsiveChange(event.detail.value);
},
_forceNarrowChanged: function () {
this._responsiveChange(this.forceNarrow || this.$.mq.queryMatches);
},
_swipeAllowed: function () {
return this.narrow && !this.disableSwipe;
},
_isMainSelected: function () {
return this.selected === 'main';
},
_startEdgePeek: function () {
this.width = this.$.drawer.offsetWidth;
this._moveDrawer(this._translateXForDeltaX(this.rightDrawer ? -this.edgeSwipeSensitivity : this.edgeSwipeSensitivity));
this._setPeeking(true);
},
_stopEdgePeek: function () {
if (this.peeking) {
this._setPeeking(false);
this._moveDrawer(null);
}
},
_downHandler: function (event) {
if (!this.dragging && this._isMainSelected() && this._isEdgeTouch(event) && !sharedPanel) {
this._startEdgePeek();
event.preventDefault();
sharedPanel = this;
}
},
_upHandler: function () {
this._stopEdgePeek();
sharedPanel = null;
},
_onTap: function (event) {
var targetElement = Polymer.dom(event).localTarget;
var isTargetToggleElement = targetElement && this.drawerToggleAttribute && targetElement.hasAttribute(this.drawerToggleAttribute);
if (isTargetToggleElement) {
this.togglePanel();
}
},
_isEdgeTouch: function (event) {
var x = event.detail.x;
return !this.disableEdgeSwipe && this._swipeAllowed() && (this.rightDrawer ? x >= this.offsetWidth - this.edgeSwipeSensitivity : x <= this.edgeSwipeSensitivity);
},
_trackStart: function (event) {
if (this._swipeAllowed()) {
sharedPanel = this;
this._setDragging(true);
if (this._isMainSelected()) {
this._setDragging(this.peeking || this._isEdgeTouch(event));
}
if (this.dragging) {
this.width = this.$.drawer.offsetWidth;
this._transition = false;
}
}
},
_translateXForDeltaX: function (deltaX) {
var isMain = this._isMainSelected();
if (this.rightDrawer) {
return Math.max(0, isMain ? this.width + deltaX : deltaX);
} else {
return Math.min(0, isMain ? deltaX - this.width : deltaX);
}
},
_trackX: function (event) {
if (this.dragging) {
var dx = event.detail.dx;
if (this.peeking) {
if (Math.abs(dx) <= this.edgeSwipeSensitivity) {
return;
}
this._setPeeking(false);
}
this._moveDrawer(this._translateXForDeltaX(dx));
}
},
_trackEnd: function (event) {
if (this.dragging) {
var xDirection = event.detail.dx > 0;
this._setDragging(false);
this._transition = true;
sharedPanel = null;
this._moveDrawer(null);
if (this.rightDrawer) {
this[xDirection ? 'closeDrawer' : 'openDrawer']();
} else {
this[xDirection ? 'openDrawer' : 'closeDrawer']();
}
}
},
_transformForTranslateX: function (translateX) {
if (translateX === null) {
return '';
}
return this.hasWillChange ? 'translateX(' + translateX + 'px)' : 'translate3d(' + translateX + 'px, 0, 0)';
},
_moveDrawer: function (translateX) {
this.transform(this._transformForTranslateX(translateX), this.$.drawer);
},
_getDrawerContent: function () {
return Polymer.dom(this.$.drawerContent).getDistributedNodes()[0];
},
_getAutoFocusedNode: function () {
var drawerContent = this._getDrawerContent();
return this.drawerFocusSelector ? Polymer.dom(drawerContent).querySelector(this.drawerFocusSelector) || drawerContent : null;
},
_toggleFocusListener: function (selected) {
if (selected === 'drawer') {
this.addEventListener('focus', this._boundFocusListener, true);
} else {
this.removeEventListener('focus', this._boundFocusListener, true);
}
},
_didFocus: function (event) {
var autoFocusedNode = this._getAutoFocusedNode();
if (!autoFocusedNode) {
return;
}
var path = Polymer.dom(event).path;
var focusedChild = path[0];
var drawerContent = this._getDrawerContent();
var focusedChildCameFromDrawer = path.indexOf(drawerContent) !== -1;
if (!focusedChildCameFromDrawer) {
event.stopPropagation();
autoFocusedNode.focus();
}
},
_isDrawerClosed: function (narrow, selected) {
return !narrow || selected !== 'drawer';
}
});
}());
(function () {
'use strict';
var SHADOW_WHEN_SCROLLING = 1;
var SHADOW_ALWAYS = 2;
var MODE_CONFIGS = {
outerScroll: { 'scroll': true },
shadowMode: {
'standard': SHADOW_ALWAYS,
'waterfall': SHADOW_WHEN_SCROLLING,
'waterfall-tall': SHADOW_WHEN_SCROLLING
},
tallMode: { 'waterfall-tall': true }
};
Polymer({
is: 'paper-header-panel',
properties: {
mode: {
type: String,
value: 'standard',
observer: '_modeChanged',
reflectToAttribute: true
},
shadow: {
type: Boolean,
value: false
},
tallClass: {
type: String,
value: 'tall'
},
atTop: {
type: Boolean,
value: true,
notify: true,
readOnly: true,
reflectToAttribute: true
}
},
observers: ['_computeDropShadowHidden(atTop, mode, shadow)'],
ready: function () {
this.scrollHandler = this._scroll.bind(this);
},
attached: function () {
this._addListener();
this._keepScrollingState();
},
detached: function () {
this._removeListener();
},
get header() {
return Polymer.dom(this.$.headerContent).getDistributedNodes()[0];
},
get scroller() {
return this._getScrollerForMode(this.mode);
},
get visibleShadow() {
return this.$.dropShadow.classList.contains('has-shadow');
},
_computeDropShadowHidden: function (atTop, mode, shadow) {
var shadowMode = MODE_CONFIGS.shadowMode[mode];
if (this.shadow) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else if (shadowMode === SHADOW_ALWAYS) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else if (shadowMode === SHADOW_WHEN_SCROLLING && !atTop) {
this.toggleClass('has-shadow', true, this.$.dropShadow);
} else {
this.toggleClass('has-shadow', false, this.$.dropShadow);
}
},
_computeMainContainerClass: function (mode) {
var classes = {};
classes['flex'] = mode !== 'cover';
return Object.keys(classes).filter(function (className) {
return classes[className];
}).join(' ');
},
_addListener: function () {
this.scroller.addEventListener('scroll', this.scrollHandler, false);
},
_removeListener: function () {
this.scroller.removeEventListener('scroll', this.scrollHandler);
},
_modeChanged: function (newMode, oldMode) {
var configs = MODE_CONFIGS;
var header = this.header;
var animateDuration = 200;
if (header) {
if (configs.tallMode[oldMode] && !configs.tallMode[newMode]) {
header.classList.remove(this.tallClass);
this.async(function () {
header.classList.remove('animate');
}, animateDuration);
} else {
header.classList.toggle('animate', configs.tallMode[newMode]);
}
}
this._keepScrollingState();
},
_keepScrollingState: function () {
var main = this.scroller;
var header = this.header;
this._setAtTop(main.scrollTop === 0);
if (header && this.tallClass && MODE_CONFIGS.tallMode[this.mode]) {
this.toggleClass(this.tallClass, this.atTop || header.classList.contains(this.tallClass) && main.scrollHeight < this.offsetHeight, header);
}
},
_scroll: function () {
this._keepScrollingState();
this.fire('content-scroll', { target: this.scroller }, { bubbles: false });
},
_getScrollerForMode: function (mode) {
return MODE_CONFIGS.outerScroll[mode] ? this : this.$.mainContainer;
}
});
}());
!function (t, e) {
function a(t, a, i) {
var r = e.createEvent('CustomEvent');
return r.initCustomEvent(t, !1, !0, a), i.dispatchEvent(r);
}
function i(e) {
var i = f.parseUrl(t.location.href, e.getAttribute('mode'));
if (i.hash !== A.hash && i.path === A.path && i.search === A.search && i.isHashPath === A.isHashPath)
return v(i.hash), A = i, void 0;
A = i;
var n = {
path: i.path,
state: t.history.state
};
if (a('state-change', n, e)) {
for (var s = e.firstElementChild; s;) {
if ('APP-ROUTE' === s.tagName && f.testRoute(s.getAttribute('path'), i.path, e.getAttribute('trailingSlash'), s.hasAttribute('regex')))
return r(e, s, i), void 0;
s = s.nextSibling;
}
a('not-found', n, e);
}
}
function r(e, i, r) {
if (i.hasAttribute('redirect'))
return e.go(i.getAttribute('redirect'), { replace: !0 }), void 0;
if (i !== e.activeRoute || 'noop' !== i.getAttribute('onUrlChange')) {
var o = {
path: r.path,
route: i,
oldRoute: e.activeRoute,
state: t.history.state
};
a('activate-route-start', o, e) && a('activate-route-start', o, i) && (e.loadingRoute = i, i === e.activeRoute && 'updateModel' === i.getAttribute('onUrlChange') ? n(e, i, r, o) : i.hasAttribute('import') ? s(e, i.getAttribute('import'), i, r, o) : i.hasAttribute('element') ? h(e, i.getAttribute('element'), i, r, o) : i.firstElementChild && 'TEMPLATE' === i.firstElementChild.tagName && (i.isInlineTemplate = !0, u(e, i.firstElementChild, i, r, o)));
}
}
function n(t, e, i, r) {
var n = l(t, e, i, r);
e.hasAttribute('template') || e.isInlineTemplate ? c(e.lastElementChild.templateInstance.model, n) : c(e.firstElementChild, n), a('activate-route-end', r, t), a('activate-route-end', r, r.route);
}
function s(t, a, i, r, n) {
function s() {
h.loaded = !0, o(t, h, a, i, r, n);
}
var h;
m.hasOwnProperty(a) ? (h = m[a], h.loaded ? o(t, h, a, i, r, n) : h.addEventListener('load', s)) : (h = e.createElement('link'), h.setAttribute('rel', 'import'), h.setAttribute('href', a), h.setAttribute('async', 'async'), h.addEventListener('load', s), h.loaded = !1, e.head.appendChild(h), m[a] = h);
}
function o(t, e, a, i, r, n) {
if (i.importLink = e, i === t.loadingRoute)
if (i.hasAttribute('template')) {
var s, o = i.getAttribute('template');
s = o ? e.import.getElementById(o) : e.import.querySelector('template'), u(t, s, i, r, n);
} else
h(t, i.getAttribute('element') || a.split('/').slice(-1)[0].replace('.html', ''), i, r, n);
}
function h(t, a, i, r, n) {
var s;
s = i && i.firstElementChild && i.firstElementChild.tagName === a.toUpperCase() ? i.firstElementChild : e.createElement(a), c(s, l(t, i, r, n)), p(t, s, r, n);
}
function u(t, a, i, r, n) {
var s;
if ('createInstance' in a) {
var o = l(t, i, r, n);
s = a.createInstance(o);
} else
s = e.importNode(a.content, !0);
p(t, s, r, n);
}
function l(t, e, i, r) {
var n = f.routeArguments(e.getAttribute('path'), i.path, i.search, e.hasAttribute('regex'), 'auto' === t.getAttribute('typecast'));
return (e.hasAttribute('bindRouter') || t.hasAttribute('bindRouter')) && (n.router = t), r.model = n, a('before-data-binding', r, t), a('before-data-binding', r, r.route), r.model;
}
function c(t, e) {
var a, i = t._prevState || (t._prevState = {});
for (a in i)
i.hasOwnProperty(a) && !e.hasOwnProperty(a) && t.properties && t.properties[a] && void 0 !== t.properties[a].value && (t[a] = t.properties[a].value, delete i[a]);
for (a in e)
e.hasOwnProperty(a) && (i[a] = !0, t[a] = e[a]);
}
function p(t, e, i, r) {
t.previousRoute = t.activeRoute, t.activeRoute = t.loadingRoute, t.loadingRoute = null, t.previousRoute && (t.previousRoute.removeAttribute('active'), t.previousRoute.style.display = 'none'), t.activeRoute.setAttribute('active', 'active'), t.activeRoute.style.display = '', e.parentNode || t.activeRoute.appendChild(e), i.hash && !t.hasAttribute('core-animated-pages') && v(i.hash), a('activate-route-end', r, t), a('activate-route-end', r, r.route);
}
function d(t) {
if (t) {
var e = t.firstChild;
for (t.isInlineTemplate && (e = t.querySelector('template').nextSibling); e;) {
var a = e;
e = e.nextSibling, t.removeChild(a);
}
}
}
function v(t) {
t && setTimeout(function () {
var a = e.querySelector('html /deep/ ' + t) || e.querySelector('html /deep/ [name="' + t.substring(1) + '"]');
a && a.scrollIntoView && a.scrollIntoView(!0);
}, 0);
}
function g(t, e, a, i, r) {
var n = t[e], s = a[i];
if ('**' === n && e === t.length - 1)
return !0;
if ('undefined' == typeof n || 'undefined' == typeof s)
return n === s;
if (n === s || '*' === n || ':' === n.charAt(0))
return ':' === n.charAt(0) && 'undefined' != typeof r && (r[n.substring(1)] = a[i]), g(t, e + 1, a, i + 1, r);
if ('**' === n)
for (var o = i; o < a.length; o++)
if (g(t, e + 1, a, o, r))
return !0;
return !1;
}
var f = {}, m = {}, b = 'ActiveXObject' in t, A = {}, E = Object.create(HTMLElement.prototype);
E.util = f, e.registerElement('app-route', { prototype: Object.create(HTMLElement.prototype) }), E.attachedCallback = function () {
'manual' !== this.getAttribute('init') && this.init();
}, E.init = function () {
var a = this;
a.isInitialized || (a.isInitialized = !0, a.hasAttribute('trailingSlash') || a.setAttribute('trailingSlash', 'strict'), a.hasAttribute('mode') || a.setAttribute('mode', 'auto'), a.hasAttribute('typecast') || a.setAttribute('typecast', 'auto'), a.hasAttribute('core-animated-pages') && (a.createShadowRoot(), a.coreAnimatedPages = e.createElement('core-animated-pages'), a.coreAnimatedPages.appendChild(e.createElement('content')), a.coreAnimatedPages.style.position = 'static', a.coreAnimatedPages.setAttribute('valueattr', 'path'), a.coreAnimatedPages.setAttribute('transitions', a.getAttribute('transitions')), a.shadowRoot.appendChild(a.coreAnimatedPages), a.coreAnimatedPages.addEventListener('core-animated-pages-transition-end', function () {
a.previousRoute && !a.previousRoute.hasAttribute('active') && d(a.previousRoute);
})), a.stateChangeHandler = i.bind(null, a), t.addEventListener('popstate', a.stateChangeHandler, !1), b && t.addEventListener('hashchange', a.stateChangeHandler, !1), i(a));
}, E.detachedCallback = function () {
t.removeEventListener('popstate', this.stateChangeHandler, !1), b && t.removeEventListener('hashchange', this.stateChangeHandler, !1);
}, E.go = function (a, i) {
if ('pushstate' !== this.getAttribute('mode') && (a = 'hashbang' === this.getAttribute('mode') ? '#!' + a : '#' + a), i && i.replace === !0)
t.history.replaceState(null, null, a);
else {
t.history.pushState(null, null, a);
try {
var r = new PopStateEvent('popstate', {
bubbles: !1,
cancelable: !1,
state: {}
});
'dispatchEvent_' in t ? t.dispatchEvent_(r) : t.dispatchEvent(r);
} catch (n) {
var s = e.createEvent('CustomEvent');
s.initCustomEvent('popstate', !1, !1, { state: {} }), t.dispatchEvent(s);
}
}
}, f.parseUrl = function (t, a) {
var i = { isHashPath: 'hash' === a };
if ('function' == typeof URL) {
var r = new URL(t);
i.path = r.pathname, i.hash = r.hash, i.search = r.search;
} else {
var n = e.createElement('a');
n.href = t, i.path = n.pathname, '/' !== i.path.charAt(0) && (i.path = '/' + i.path), i.hash = n.hash, i.search = n.search;
}
if ('pushstate' !== a && ('#/' === i.hash.substring(0, 2) ? (i.isHashPath = !0, i.path = i.hash.substring(1)) : '#!/' === i.hash.substring(0, 3) ? (i.isHashPath = !0, i.path = i.hash.substring(2)) : i.isHashPath && (i.path = 0 === i.hash.length ? '/' : i.hash.substring(1)), i.isHashPath)) {
i.hash = '';
var s = i.path.indexOf('#');
-1 !== s && (i.hash = i.path.substring(s), i.path = i.path.substring(0, s));
var o = i.path.indexOf('?');
-1 !== o && (i.search = i.path.substring(o), i.path = i.path.substring(0, o));
}
return i;
}, f.testRoute = function (t, e, a, i) {
return 'ignore' === a && ('/' === e.slice(-1) && (e = e.slice(0, -1)), '/' !== t.slice(-1) || i || (t = t.slice(0, -1))), i ? f.testRegExString(t, e) : t === e || '*' === t ? !0 : ('/' !== t.charAt(0) && (t = '/**/' + t), g(t.split('/'), 1, e.split('/'), 1));
}, f.routeArguments = function (t, e, a, i, r) {
var n = {};
i || ('/' !== t.charAt(0) && (t = '/**/' + t), g(t.split('/'), 1, e.split('/'), 1, n));
var s = a.substring(1).split('&');
1 === s.length && '' === s[0] && (s = []);
for (var o = 0; o < s.length; o++) {
var h = s[o], u = h.split('=');
n[u[0]] = u.splice(1, u.length - 1).join('=');
}
if (r)
for (var l in n)
n[l] = f.typecast(n[l]);
return n;
}, f.typecast = function (t) {
return 'true' === t ? !0 : 'false' === t ? !1 : isNaN(t) || '' === t || '0' === t.charAt(0) ? decodeURIComponent(t) : +t;
}, f.testRegExString = function (t, e) {
if ('/' !== t.charAt(0))
return !1;
t = t.slice(1);
var a = '';
if ('/' === t.slice(-1))
t = t.slice(0, -1);
else {
if ('/i' !== t.slice(-2))
return !1;
t = t.slice(0, -2), a = 'i';
}
return new RegExp(t, a).test(e);
}, e.registerElement('app-router', { prototype: E });
}(window, document);
(function () {
'use strict';
Polymer.IronA11yAnnouncer = Polymer({
is: 'iron-a11y-announcer',
properties: {
mode: {
type: String,
value: 'polite'
},
_text: {
type: String,
value: ''
}
},
created: function () {
if (!Polymer.IronA11yAnnouncer.instance) {
Polymer.IronA11yAnnouncer.instance = this;
}
document.body.addEventListener('iron-announce', this._onIronAnnounce.bind(this));
},
announce: function (text) {
this._text = '';
this.async(function () {
this._text = text;
}, 100);
},
_onIronAnnounce: function (event) {
if (event.detail && event.detail.text) {
this.announce(event.detail.text);
}
}
});
Polymer.IronA11yAnnouncer.instance = null;
Polymer.IronA11yAnnouncer.requestAvailability = function () {
if (!Polymer.IronA11yAnnouncer.instance) {
Polymer.IronA11yAnnouncer.instance = document.createElement('iron-a11y-announcer');
}
document.body.appendChild(Polymer.IronA11yAnnouncer.instance);
};
}());
Polymer.IronFitBehavior = {
properties: {
sizingTarget: {
type: Object,
value: function () {
return this;
}
},
fitInto: {
type: Object,
value: window
},
autoFitOnAttach: {
type: Boolean,
value: false
},
_fitInfo: { type: Object }
},
get _fitWidth() {
var fitWidth;
if (this.fitInto === window) {
fitWidth = this.fitInto.innerWidth;
} else {
fitWidth = this.fitInto.getBoundingClientRect().width;
}
return fitWidth;
},
get _fitHeight() {
var fitHeight;
if (this.fitInto === window) {
fitHeight = this.fitInto.innerHeight;
} else {
fitHeight = this.fitInto.getBoundingClientRect().height;
}
return fitHeight;
},
get _fitLeft() {
var fitLeft;
if (this.fitInto === window) {
fitLeft = 0;
} else {
fitLeft = this.fitInto.getBoundingClientRect().left;
}
return fitLeft;
},
get _fitTop() {
var fitTop;
if (this.fitInto === window) {
fitTop = 0;
} else {
fitTop = this.fitInto.getBoundingClientRect().top;
}
return fitTop;
},
attached: function () {
if (this.autoFitOnAttach) {
if (window.getComputedStyle(this).display === 'none') {
setTimeout(function () {
this.fit();
}.bind(this));
} else {
this.fit();
}
}
},
fit: function () {
this._discoverInfo();
this.constrain();
this.center();
},
_discoverInfo: function () {
if (this._fitInfo) {
return;
}
var target = window.getComputedStyle(this);
var sizer = window.getComputedStyle(this.sizingTarget);
this._fitInfo = {
inlineStyle: {
top: this.style.top || '',
left: this.style.left || ''
},
positionedBy: {
vertically: target.top !== 'auto' ? 'top' : target.bottom !== 'auto' ? 'bottom' : null,
horizontally: target.left !== 'auto' ? 'left' : target.right !== 'auto' ? 'right' : null,
css: target.position
},
sizedBy: {
height: sizer.maxHeight !== 'none',
width: sizer.maxWidth !== 'none'
},
margin: {
top: parseInt(target.marginTop, 10) || 0,
right: parseInt(target.marginRight, 10) || 0,
bottom: parseInt(target.marginBottom, 10) || 0,
left: parseInt(target.marginLeft, 10) || 0
}
};
},
resetFit: function () {
if (!this._fitInfo || !this._fitInfo.sizedBy.width) {
this.sizingTarget.style.maxWidth = '';
}
if (!this._fitInfo || !this._fitInfo.sizedBy.height) {
this.sizingTarget.style.maxHeight = '';
}
this.style.top = this._fitInfo ? this._fitInfo.inlineStyle.top : '';
this.style.left = this._fitInfo ? this._fitInfo.inlineStyle.left : '';
if (this._fitInfo) {
this.style.position = this._fitInfo.positionedBy.css;
}
this._fitInfo = null;
},
refit: function () {
this.resetFit();
this.fit();
},
constrain: function () {
var info = this._fitInfo;
if (!this._fitInfo.positionedBy.vertically) {
this.style.top = '0px';
}
if (!this._fitInfo.positionedBy.horizontally) {
this.style.left = '0px';
}
if (!this._fitInfo.positionedBy.vertically || !this._fitInfo.positionedBy.horizontally) {
this.style.position = 'fixed';
}
this.sizingTarget.style.boxSizing = 'border-box';
var rect = this.getBoundingClientRect();
if (!info.sizedBy.height) {
this._sizeDimension(rect, info.positionedBy.vertically, 'top', 'bottom', 'Height');
}
if (!info.sizedBy.width) {
this._sizeDimension(rect, info.positionedBy.horizontally, 'left', 'right', 'Width');
}
},
_sizeDimension: function (rect, positionedBy, start, end, extent) {
var info = this._fitInfo;
var max = extent === 'Width' ? this._fitWidth : this._fitHeight;
var flip = positionedBy === end;
var offset = flip ? max - rect[end] : rect[start];
var margin = info.margin[flip ? start : end];
var offsetExtent = 'offset' + extent;
var sizingOffset = this[offsetExtent] - this.sizingTarget[offsetExtent];
this.sizingTarget.style['max' + extent] = max - margin - offset - sizingOffset + 'px';
},
center: function () {
var positionedBy = this._fitInfo.positionedBy;
if (positionedBy.vertically && positionedBy.horizontally) {
return;
}
this.style.position = 'fixed';
if (!positionedBy.vertically) {
this.style.top = '0px';
}
if (!positionedBy.horizontally) {
this.style.left = '0px';
}
var rect = this.getBoundingClientRect();
if (!positionedBy.vertically) {
var top = this._fitTop - rect.top + (this._fitHeight - rect.height) / 2;
this.style.top = top + 'px';
}
if (!positionedBy.horizontally) {
var left = this._fitLeft - rect.left + (this._fitWidth - rect.width) / 2;
this.style.left = left + 'px';
}
}
};
(function () {
'use strict';
var KEY_IDENTIFIER = {
'U+0008': 'backspace',
'U+0009': 'tab',
'U+001B': 'esc',
'U+0020': 'space',
'U+007F': 'del'
};
var KEY_CODE = {
8: 'backspace',
9: 'tab',
13: 'enter',
27: 'esc',
33: 'pageup',
34: 'pagedown',
35: 'end',
36: 'home',
32: 'space',
37: 'left',
38: 'up',
39: 'right',
40: 'down',
46: 'del',
106: '*'
};
var MODIFIER_KEYS = {
'shift': 'shiftKey',
'ctrl': 'ctrlKey',
'alt': 'altKey',
'meta': 'metaKey'
};
var KEY_CHAR = /[a-z0-9*]/;
var IDENT_CHAR = /U\+/;
var ARROW_KEY = /^arrow/;
var SPACE_KEY = /^space(bar)?/;
var ESC_KEY = /^escape$/;
function transformKey(key, noSpecialChars) {
var validKey = '';
if (key) {
var lKey = key.toLowerCase();
if (lKey === ' ' || SPACE_KEY.test(lKey)) {
validKey = 'space';
} else if (ESC_KEY.test(lKey)) {
validKey = 'esc';
} else if (lKey.length == 1) {
if (!noSpecialChars || KEY_CHAR.test(lKey)) {
validKey = lKey;
}
} else if (ARROW_KEY.test(lKey)) {
validKey = lKey.replace('arrow', '');
} else if (lKey == 'multiply') {
validKey = '*';
} else {
validKey = lKey;
}
}
return validKey;
}
function transformKeyIdentifier(keyIdent) {
var validKey = '';
if (keyIdent) {
if (keyIdent in KEY_IDENTIFIER) {
validKey = KEY_IDENTIFIER[keyIdent];
} else if (IDENT_CHAR.test(keyIdent)) {
keyIdent = parseInt(keyIdent.replace('U+', '0x'), 16);
validKey = String.fromCharCode(keyIdent).toLowerCase();
} else {
validKey = keyIdent.toLowerCase();
}
}
return validKey;
}
function transformKeyCode(keyCode) {
var validKey = '';
if (Number(keyCode)) {
if (keyCode >= 65 && keyCode <= 90) {
validKey = String.fromCharCode(32 + keyCode);
} else if (keyCode >= 112 && keyCode <= 123) {
validKey = 'f' + (keyCode - 112);
} else if (keyCode >= 48 && keyCode <= 57) {
validKey = String(keyCode - 48);
} else if (keyCode >= 96 && keyCode <= 105) {
validKey = String(keyCode - 96);
} else {
validKey = KEY_CODE[keyCode];
}
}
return validKey;
}
function normalizedKeyForEvent(keyEvent, noSpecialChars) {
return transformKey(keyEvent.key, noSpecialChars) || transformKeyIdentifier(keyEvent.keyIdentifier) || transformKeyCode(keyEvent.keyCode) || transformKey(keyEvent.detail.key, noSpecialChars) || '';
}
function keyComboMatchesEvent(keyCombo, event) {
var keyEvent = normalizedKeyForEvent(event, keyCombo.hasModifiers);
return keyEvent === keyCombo.key && (!keyCombo.hasModifiers || !!event.shiftKey === !!keyCombo.shiftKey && !!event.ctrlKey === !!keyCombo.ctrlKey && !!event.altKey === !!keyCombo.altKey && !!event.metaKey === !!keyCombo.metaKey);
}
function parseKeyComboString(keyComboString) {
if (keyComboString.length === 1) {
return {
combo: keyComboString,
key: keyComboString,
event: 'keydown'
};
}
return keyComboString.split('+').reduce(function (parsedKeyCombo, keyComboPart) {
var eventParts = keyComboPart.split(':');
var keyName = eventParts[0];
var event = eventParts[1];
if (keyName in MODIFIER_KEYS) {
parsedKeyCombo[MODIFIER_KEYS[keyName]] = true;
parsedKeyCombo.hasModifiers = true;
} else {
parsedKeyCombo.key = keyName;
parsedKeyCombo.event = event || 'keydown';
}
return parsedKeyCombo;
}, { combo: keyComboString.split(':').shift() });
}
function parseEventString(eventString) {
return eventString.trim().split(' ').map(function (keyComboString) {
return parseKeyComboString(keyComboString);
});
}
Polymer.IronA11yKeysBehavior = {
properties: {
keyEventTarget: {
type: Object,
value: function () {
return this;
}
},
stopKeyboardEventPropagation: {
type: Boolean,
value: false
},
_boundKeyHandlers: {
type: Array,
value: function () {
return [];
}
},
_imperativeKeyBindings: {
type: Object,
value: function () {
return {};
}
}
},
observers: ['_resetKeyEventListeners(keyEventTarget, _boundKeyHandlers)'],
keyBindings: {},
registered: function () {
this._prepKeyBindings();
},
attached: function () {
this._listenKeyEventListeners();
},
detached: function () {
this._unlistenKeyEventListeners();
},
addOwnKeyBinding: function (eventString, handlerName) {
this._imperativeKeyBindings[eventString] = handlerName;
this._prepKeyBindings();
this._resetKeyEventListeners();
},
removeOwnKeyBindings: function () {
this._imperativeKeyBindings = {};
this._prepKeyBindings();
this._resetKeyEventListeners();
},
keyboardEventMatchesKeys: function (event, eventString) {
var keyCombos = parseEventString(eventString);
for (var i = 0; i < keyCombos.length; ++i) {
if (keyComboMatchesEvent(keyCombos[i], event)) {
return true;
}
}
return false;
},
_collectKeyBindings: function () {
var keyBindings = this.behaviors.map(function (behavior) {
return behavior.keyBindings;
});
if (keyBindings.indexOf(this.keyBindings) === -1) {
keyBindings.push(this.keyBindings);
}
return keyBindings;
},
_prepKeyBindings: function () {
this._keyBindings = {};
this._collectKeyBindings().forEach(function (keyBindings) {
for (var eventString in keyBindings) {
this._addKeyBinding(eventString, keyBindings[eventString]);
}
}, this);
for (var eventString in this._imperativeKeyBindings) {
this._addKeyBinding(eventString, this._imperativeKeyBindings[eventString]);
}
for (var eventName in this._keyBindings) {
this._keyBindings[eventName].sort(function (kb1, kb2) {
var b1 = kb1[0].hasModifiers;
var b2 = kb2[0].hasModifiers;
return b1 === b2 ? 0 : b1 ? -1 : 1;
});
}
},
_addKeyBinding: function (eventString, handlerName) {
parseEventString(eventString).forEach(function (keyCombo) {
this._keyBindings[keyCombo.event] = this._keyBindings[keyCombo.event] || [];
this._keyBindings[keyCombo.event].push([
keyCombo,
handlerName
]);
}, this);
},
_resetKeyEventListeners: function () {
this._unlistenKeyEventListeners();
if (this.isAttached) {
this._listenKeyEventListeners();
}
},
_listenKeyEventListeners: function () {
Object.keys(this._keyBindings).forEach(function (eventName) {
var keyBindings = this._keyBindings[eventName];
var boundKeyHandler = this._onKeyBindingEvent.bind(this, keyBindings);
this._boundKeyHandlers.push([
this.keyEventTarget,
eventName,
boundKeyHandler
]);
this.keyEventTarget.addEventListener(eventName, boundKeyHandler);
}, this);
},
_unlistenKeyEventListeners: function () {
var keyHandlerTuple;
var keyEventTarget;
var eventName;
var boundKeyHandler;
while (this._boundKeyHandlers.length) {
keyHandlerTuple = this._boundKeyHandlers.pop();
keyEventTarget = keyHandlerTuple[0];
eventName = keyHandlerTuple[1];
boundKeyHandler = keyHandlerTuple[2];
keyEventTarget.removeEventListener(eventName, boundKeyHandler);
}
},
_onKeyBindingEvent: function (keyBindings, event) {
if (this.stopKeyboardEventPropagation) {
event.stopPropagation();
}
if (event.defaultPrevented) {
return;
}
for (var i = 0; i < keyBindings.length; i++) {
var keyCombo = keyBindings[i][0];
var handlerName = keyBindings[i][1];
if (keyComboMatchesEvent(keyCombo, event)) {
this._triggerKeyHandler(keyCombo, handlerName, event);
if (event.defaultPrevented) {
return;
}
}
}
},
_triggerKeyHandler: function (keyCombo, handlerName, keyboardEvent) {
var detail = Object.create(keyCombo);
detail.keyboardEvent = keyboardEvent;
var event = new CustomEvent(keyCombo.event, {
detail: detail,
cancelable: true
});
this[handlerName].call(this, event);
if (event.defaultPrevented) {
keyboardEvent.preventDefault();
}
}
};
}());
Polymer.IronOverlayManagerClass = function () {
this._overlays = [];
this._minimumZ = 101;
this._backdropElement = null;
var clickEvent = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
document.addEventListener(clickEvent, this._onCaptureClick.bind(this), true);
document.addEventListener('focus', this._onCaptureFocus.bind(this), true);
document.addEventListener('keydown', this._onCaptureKeyDown.bind(this), true);
};
Polymer.IronOverlayManagerClass.prototype = {
constructor: Polymer.IronOverlayManagerClass,
get backdropElement() {
if (!this._backdropElement) {
this._backdropElement = document.createElement('iron-overlay-backdrop');
}
return this._backdropElement;
},
get deepActiveElement() {
var active = document.activeElement || document.body;
while (active.root && Polymer.dom(active.root).activeElement) {
active = Polymer.dom(active.root).activeElement;
}
return active;
},
_bringOverlayAtIndexToFront: function (i) {
var overlay = this._overlays[i];
if (!overlay) {
return;
}
var lastI = this._overlays.length - 1;
var currentOverlay = this._overlays[lastI];
if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
lastI--;
}
if (i >= lastI) {
return;
}
var minimumZ = Math.max(this.currentOverlayZ(), this._minimumZ);
if (this._getZ(overlay) <= minimumZ) {
this._applyOverlayZ(overlay, minimumZ);
}
while (i < lastI) {
this._overlays[i] = this._overlays[i + 1];
i++;
}
this._overlays[lastI] = overlay;
},
addOrRemoveOverlay: function (overlay) {
if (overlay.opened) {
this.addOverlay(overlay);
} else {
this.removeOverlay(overlay);
}
this.trackBackdrop();
},
addOverlay: function (overlay) {
var i = this._overlays.indexOf(overlay);
if (i >= 0) {
this._bringOverlayAtIndexToFront(i);
return;
}
var insertionIndex = this._overlays.length;
var currentOverlay = this._overlays[insertionIndex - 1];
var minimumZ = Math.max(this._getZ(currentOverlay), this._minimumZ);
var newZ = this._getZ(overlay);
if (currentOverlay && this._shouldBeBehindOverlay(overlay, currentOverlay)) {
this._applyOverlayZ(currentOverlay, minimumZ);
insertionIndex--;
var previousOverlay = this._overlays[insertionIndex - 1];
minimumZ = Math.max(this._getZ(previousOverlay), this._minimumZ);
}
if (newZ <= minimumZ) {
this._applyOverlayZ(overlay, minimumZ);
}
this._overlays.splice(insertionIndex, 0, overlay);
var element = this.deepActiveElement;
overlay.restoreFocusNode = this._overlayParent(element) ? null : element;
},
removeOverlay: function (overlay) {
var i = this._overlays.indexOf(overlay);
if (i === -1) {
return;
}
this._overlays.splice(i, 1);
var node = overlay.restoreFocusOnClose ? overlay.restoreFocusNode : null;
overlay.restoreFocusNode = null;
if (node && Polymer.dom(document.body).deepContains(node)) {
node.focus();
}
},
currentOverlay: function () {
var i = this._overlays.length - 1;
return this._overlays[i];
},
currentOverlayZ: function () {
return this._getZ(this.currentOverlay());
},
ensureMinimumZ: function (minimumZ) {
this._minimumZ = Math.max(this._minimumZ, minimumZ);
},
focusOverlay: function () {
var current = this.currentOverlay();
if (current && !current.transitioning) {
current._applyFocus();
}
},
trackBackdrop: function () {
this.backdropElement.style.zIndex = this.backdropZ();
},
getBackdrops: function () {
var backdrops = [];
for (var i = 0; i < this._overlays.length; i++) {
if (this._overlays[i].withBackdrop) {
backdrops.push(this._overlays[i]);
}
}
return backdrops;
},
backdropZ: function () {
return this._getZ(this._overlayWithBackdrop()) - 1;
},
_overlayWithBackdrop: function () {
for (var i = 0; i < this._overlays.length; i++) {
if (this._overlays[i].withBackdrop) {
return this._overlays[i];
}
}
},
_getZ: function (overlay) {
var z = this._minimumZ;
if (overlay) {
var z1 = Number(overlay.style.zIndex || window.getComputedStyle(overlay).zIndex);
if (z1 === z1) {
z = z1;
}
}
return z;
},
_setZ: function (element, z) {
element.style.zIndex = z;
},
_applyOverlayZ: function (overlay, aboveZ) {
this._setZ(overlay, aboveZ + 2);
},
_overlayParent: function (node) {
while (node && node !== document.body) {
if (node._manager === this) {
return node;
}
node = Polymer.dom(node).parentNode || node.host;
}
},
_overlayInPath: function (path) {
path = path || [];
for (var i = 0; i < path.length; i++) {
if (path[i]._manager === this) {
return path[i];
}
}
},
_onCaptureClick: function (event) {
var overlay = this.currentOverlay();
if (overlay && this._overlayInPath(Polymer.dom(event).path) !== overlay) {
overlay._onCaptureClick(event);
}
},
_onCaptureFocus: function (event) {
var overlay = this.currentOverlay();
if (overlay) {
overlay._onCaptureFocus(event);
}
},
_onCaptureKeyDown: function (event) {
var overlay = this.currentOverlay();
if (overlay) {
if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'esc')) {
overlay._onCaptureEsc(event);
} else if (Polymer.IronA11yKeysBehavior.keyboardEventMatchesKeys(event, 'tab')) {
overlay._onCaptureTab(event);
}
}
},
_shouldBeBehindOverlay: function (overlay1, overlay2) {
var o1 = overlay1;
var o2 = overlay2;
return !o1.alwaysOnTop && o2.alwaysOnTop;
}
};
Polymer.IronOverlayManager = new Polymer.IronOverlayManagerClass();
(function () {
Polymer({
is: 'iron-overlay-backdrop',
properties: {
opened: {
readOnly: true,
reflectToAttribute: true,
type: Boolean,
value: false
},
_manager: {
type: Object,
value: Polymer.IronOverlayManager
}
},
listeners: { 'transitionend': '_onTransitionend' },
prepare: function () {
if (!this.parentNode) {
Polymer.dom(document.body).appendChild(this);
}
},
open: function () {
if (this._manager.getBackdrops().length < 2) {
this._setOpened(true);
}
},
close: function () {
if (this._manager.getBackdrops().length === 0) {
var cs = getComputedStyle(this);
var noAnimation = cs.transitionDuration === '0s' || cs.opacity == 0;
this._setOpened(false);
if (noAnimation) {
this.complete();
}
}
},
complete: function () {
if (this._manager.getBackdrops().length === 0 && this.parentNode) {
Polymer.dom(this.parentNode).removeChild(this);
}
},
_onTransitionend: function (event) {
if (event && event.target === this) {
this.complete();
}
}
});
}());
(function () {
'use strict';
Polymer.IronOverlayBehaviorImpl = {
properties: {
opened: {
observer: '_openedChanged',
type: Boolean,
value: false,
notify: true
},
canceled: {
observer: '_canceledChanged',
readOnly: true,
type: Boolean,
value: false
},
withBackdrop: {
observer: '_withBackdropChanged',
type: Boolean
},
noAutoFocus: {
type: Boolean,
value: false
},
noCancelOnEscKey: {
type: Boolean,
value: false
},
noCancelOnOutsideClick: {
type: Boolean,
value: false
},
closingReason: { type: Object },
restoreFocusOnClose: {
type: Boolean,
value: false
},
alwaysOnTop: { type: Boolean },
_manager: {
type: Object,
value: Polymer.IronOverlayManager
},
_focusedChild: { type: Object }
},
listeners: { 'iron-resize': '_onIronResize' },
get backdropElement() {
return this._manager.backdropElement;
},
get _focusNode() {
return this._focusedChild || Polymer.dom(this).querySelector('[autofocus]') || this;
},
get _focusableNodes() {
var FOCUSABLE_WITH_DISABLED = [
'a[href]',
'area[href]',
'iframe',
'[tabindex]',
'[contentEditable=true]'
];
var FOCUSABLE_WITHOUT_DISABLED = [
'input',
'select',
'textarea',
'button'
];
var selector = FOCUSABLE_WITH_DISABLED.join(':not([tabindex="-1"]),') + ':not([tabindex="-1"]),' + FOCUSABLE_WITHOUT_DISABLED.join(':not([disabled]):not([tabindex="-1"]),') + ':not([disabled]):not([tabindex="-1"])';
var focusables = Polymer.dom(this).querySelectorAll(selector);
if (this.tabIndex >= 0) {
focusables.splice(0, 0, this);
}
return focusables.sort(function (a, b) {
if (a.tabIndex === b.tabIndex) {
return 0;
}
if (a.tabIndex === 0 || a.tabIndex > b.tabIndex) {
return 1;
}
return -1;
});
},
ready: function () {
this.__isAnimating = false;
this.__shouldRemoveTabIndex = false;
this.__firstFocusableNode = this.__lastFocusableNode = null;
this.__openChangedAsync = null;
this.__onIronResizeAsync = null;
this._ensureSetup();
},
attached: function () {
if (this.opened) {
this._openedChanged();
}
this._observer = Polymer.dom(this).observeNodes(this._onNodesChange);
},
detached: function () {
Polymer.dom(this).unobserveNodes(this._observer);
this._observer = null;
this.opened = false;
if (this.withBackdrop) {
this.backdropElement.close();
}
},
toggle: function () {
this._setCanceled(false);
this.opened = !this.opened;
},
open: function () {
this._setCanceled(false);
this.opened = true;
},
close: function () {
this._setCanceled(false);
this.opened = false;
},
cancel: function (event) {
var cancelEvent = this.fire('iron-overlay-canceled', event, { cancelable: true });
if (cancelEvent.defaultPrevented) {
return;
}
this._setCanceled(true);
this.opened = false;
},
_ensureSetup: function () {
if (this._overlaySetup) {
return;
}
this._overlaySetup = true;
this.style.outline = 'none';
this.style.display = 'none';
},
_openedChanged: function () {
if (this.opened) {
this.removeAttribute('aria-hidden');
} else {
this.setAttribute('aria-hidden', 'true');
}
if (!this._overlaySetup) {
return;
}
this._manager.addOrRemoveOverlay(this);
this.__isAnimating = true;
if (this.__openChangedAsync) {
window.cancelAnimationFrame(this.__openChangedAsync);
}
if (this.opened) {
if (this.withBackdrop) {
this.backdropElement.prepare();
}
this.__openChangedAsync = window.requestAnimationFrame(function () {
this.__openChangedAsync = null;
this._prepareRenderOpened();
this._renderOpened();
}.bind(this));
} else {
this._renderClosed();
}
},
_canceledChanged: function () {
this.closingReason = this.closingReason || {};
this.closingReason.canceled = this.canceled;
},
_withBackdropChanged: function () {
if (this.withBackdrop && !this.hasAttribute('tabindex')) {
this.setAttribute('tabindex', '-1');
this.__shouldRemoveTabIndex = true;
} else if (this.__shouldRemoveTabIndex) {
this.removeAttribute('tabindex');
this.__shouldRemoveTabIndex = false;
}
if (this.opened) {
this._manager.trackBackdrop();
if (this.withBackdrop) {
this.backdropElement.prepare();
this.async(function () {
this.backdropElement.open();
}, 1);
} else {
this.backdropElement.close();
}
}
},
_prepareRenderOpened: function () {
this._preparePositioning();
this.refit();
this._finishPositioning();
if (this.noAutoFocus && document.activeElement === this._focusNode) {
this._focusNode.blur();
}
},
_renderOpened: function () {
if (this.withBackdrop) {
this.backdropElement.open();
}
this._finishRenderOpened();
},
_renderClosed: function () {
if (this.withBackdrop) {
this.backdropElement.close();
}
this._finishRenderClosed();
},
_finishRenderOpened: function () {
this._applyFocus();
this.notifyResize();
this.__isAnimating = false;
this.fire('iron-overlay-opened');
},
_finishRenderClosed: function () {
this.style.display = 'none';
this.style.zIndex = '';
this._applyFocus();
this.notifyResize();
this.__isAnimating = false;
this.fire('iron-overlay-closed', this.closingReason);
},
_preparePositioning: function () {
this.style.transition = this.style.webkitTransition = 'none';
this.style.transform = this.style.webkitTransform = 'none';
this.style.display = '';
},
_finishPositioning: function () {
this.style.display = 'none';
this.scrollTop = this.scrollTop;
this.style.transition = this.style.webkitTransition = '';
this.style.transform = this.style.webkitTransform = '';
this.style.display = '';
this.scrollTop = this.scrollTop;
},
_applyFocus: function () {
if (this.opened) {
if (!this.noAutoFocus) {
this._focusNode.focus();
}
} else {
this._focusNode.blur();
this._focusedChild = null;
this._manager.focusOverlay();
}
},
_onCaptureClick: function (event) {
if (!this.noCancelOnOutsideClick) {
this.cancel(event);
}
},
_onCaptureFocus: function (event) {
if (!this.withBackdrop) {
return;
}
var path = Polymer.dom(event).path;
if (path.indexOf(this) === -1) {
event.stopPropagation();
this._applyFocus();
} else {
this._focusedChild = path[0];
}
},
_onCaptureEsc: function (event) {
if (!this.noCancelOnEscKey) {
this.cancel(event);
}
},
_onCaptureTab: function (event) {
var shift = event.shiftKey;
var nodeToCheck = shift ? this.__firstFocusableNode : this.__lastFocusableNode;
var nodeToSet = shift ? this.__lastFocusableNode : this.__firstFocusableNode;
if (this.withBackdrop && this._focusedChild === nodeToCheck) {
this._focusedChild = nodeToSet;
}
},
_onIronResize: function () {
if (this.__onIronResizeAsync) {
window.cancelAnimationFrame(this.__onIronResizeAsync);
this.__onIronResizeAsync = null;
}
if (this.opened && !this.__isAnimating) {
this.__onIronResizeAsync = window.requestAnimationFrame(function () {
this.__onIronResizeAsync = null;
this.refit();
}.bind(this));
}
},
_onNodesChange: function () {
if (this.opened && !this.__isAnimating) {
this.notifyResize();
}
var focusableNodes = this._focusableNodes;
this.__firstFocusableNode = focusableNodes[0];
this.__lastFocusableNode = focusableNodes[focusableNodes.length - 1];
}
};
Polymer.IronOverlayBehavior = [
Polymer.IronFitBehavior,
Polymer.IronResizableBehavior,
Polymer.IronOverlayBehaviorImpl
];
}());
(function () {
var currentToast = null;
Polymer({
is: 'paper-toast',
behaviors: [Polymer.IronOverlayBehavior],
properties: {
duration: {
type: Number,
value: 3000
},
text: {
type: String,
value: ''
},
noCancelOnOutsideClick: {
type: Boolean,
value: true
},
noAutoFocus: {
type: Boolean,
value: true
}
},
listeners: { 'transitionend': '__onTransitionEnd' },
get visible() {
console.warn('`visible` is deprecated, use `opened` instead');
return this.opened;
},
get _canAutoClose() {
return this.duration > 0 && this.duration !== Infinity;
},
created: function () {
this._autoClose = null;
Polymer.IronA11yAnnouncer.requestAvailability();
},
show: function (properties) {
if (typeof properties == 'string') {
properties = { text: properties };
}
for (var property in properties) {
if (property.indexOf('_') === 0) {
console.warn('The property "' + property + '" is private and was not set.');
} else if (property in this) {
this[property] = properties[property];
} else {
console.warn('The property "' + property + '" is not valid.');
}
}
this.open();
},
hide: function () {
this.close();
},
center: function () {
if (this.fitInto === window) {
this.style.bottom = this.style.left = '';
} else {
var rect = this.fitInto.getBoundingClientRect();
this.style.left = rect.left + 'px';
this.style.bottom = window.innerHeight - rect.bottom + 'px';
}
},
__onTransitionEnd: function (e) {
if (e && e.target === this && e.propertyName === 'opacity') {
if (this.opened) {
this._finishRenderOpened();
} else {
this._finishRenderClosed();
}
}
},
_openedChanged: function () {
if (this._autoClose !== null) {
this.cancelAsync(this._autoClose);
this._autoClose = null;
}
if (this.opened) {
if (currentToast && currentToast !== this) {
currentToast.close();
}
currentToast = this;
this.fire('iron-announce', { text: this.text });
if (this._canAutoClose) {
this._autoClose = this.async(this.close, this.duration);
}
} else if (currentToast === this) {
currentToast = null;
}
Polymer.IronOverlayBehaviorImpl._openedChanged.apply(this, arguments);
},
_renderOpened: function () {
this.classList.add('paper-toast-open');
},
_renderClosed: function () {
this.classList.remove('paper-toast-open');
},
_onIronResize: function () {
Polymer.IronOverlayBehaviorImpl._onIronResize.apply(this, arguments);
if (this.opened) {
this.style.position = '';
}
}
});
}());
Polymer({
is: 'app-link',
extends: 'a',
properties: { skipNav: Boolean },
listeners: { 'click': 'navigate' },
navigate: function (e) {
if (e.ctrlKey || e.metaKey) {
return true;
} else {
e.preventDefault();
if (!this.skipNav)
this.fire('nav', { url: this.href });
}
}
});
Polymer({
is: 'app-logo',
enableCustomStyleProperties: true,
properties: {
full: {
type: Boolean,
value: false
}
}
});
(function () {
var metaDatas = {};
var metaArrays = {};
var singleton = null;
Polymer.IronMeta = Polymer({
is: 'iron-meta',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
observer: '_valueChanged'
},
self: {
type: Boolean,
observer: '_selfChanged'
},
list: {
type: Array,
notify: true
}
},
hostAttributes: { hidden: true },
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
case 'value':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key, old) {
this._resetRegistration(old);
},
_valueChanged: function (value) {
this._resetRegistration(this.key);
},
_selfChanged: function (self) {
if (self) {
this.value = this;
}
},
_typeChanged: function (type) {
this._unregisterKey(this.key);
if (!metaDatas[type]) {
metaDatas[type] = {};
}
this._metaData = metaDatas[type];
if (!metaArrays[type]) {
metaArrays[type] = [];
}
this.list = metaArrays[type];
this._registerKeyValue(this.key, this.value);
},
byKey: function (key) {
return this._metaData && this._metaData[key];
},
_resetRegistration: function (oldKey) {
this._unregisterKey(oldKey);
this._registerKeyValue(this.key, this.value);
},
_unregisterKey: function (key) {
this._unregister(key, this._metaData, this.list);
},
_registerKeyValue: function (key, value) {
this._register(key, value, this._metaData, this.list);
},
_register: function (key, value, data, list) {
if (key && data && value !== undefined) {
data[key] = value;
list.push(value);
}
},
_unregister: function (key, data, list) {
if (key && data) {
if (key in data) {
var value = data[key];
delete data[key];
this.arrayDelete(list, value);
}
}
}
});
Polymer.IronMeta.getIronMeta = function getIronMeta() {
if (singleton === null) {
singleton = new Polymer.IronMeta();
}
return singleton;
};
Polymer.IronMetaQuery = Polymer({
is: 'iron-meta-query',
properties: {
type: {
type: String,
value: 'default',
observer: '_typeChanged'
},
key: {
type: String,
observer: '_keyChanged'
},
value: {
type: Object,
notify: true,
readOnly: true
},
list: {
type: Array,
notify: true
}
},
factoryImpl: function (config) {
if (config) {
for (var n in config) {
switch (n) {
case 'type':
case 'key':
this[n] = config[n];
break;
}
}
}
},
created: function () {
this._metaDatas = metaDatas;
this._metaArrays = metaArrays;
},
_keyChanged: function (key) {
this._setValue(this._metaData && this._metaData[key]);
},
_typeChanged: function (type) {
this._metaData = metaDatas[type];
this.list = metaArrays[type];
if (this.key) {
this._keyChanged(this.key);
}
},
byKey: function (key) {
return this._metaData && this._metaData[key];
}
});
}());
Polymer({
is: 'iron-icon',
properties: {
icon: {
type: String,
observer: '_iconChanged'
},
theme: {
type: String,
observer: '_updateIcon'
},
src: {
type: String,
observer: '_srcChanged'
},
_meta: {
value: Polymer.Base.create('iron-meta', { type: 'iconset' }),
observer: '_updateIcon'
}
},
_DEFAULT_ICONSET: 'icons',
_iconChanged: function (icon) {
var parts = (icon || '').split(':');
this._iconName = parts.pop();
this._iconsetName = parts.pop() || this._DEFAULT_ICONSET;
this._updateIcon();
},
_srcChanged: function (src) {
this._updateIcon();
},
_usesIconset: function () {
return this.icon || !this.src;
},
_updateIcon: function () {
if (this._usesIconset()) {
if (this._img && this._img.parentNode) {
Polymer.dom(this.root).removeChild(this._img);
}
if (this._iconName === '') {
if (this._iconset) {
this._iconset.removeIcon(this);
}
} else if (this._iconsetName && this._meta) {
this._iconset = this._meta.byKey(this._iconsetName);
if (this._iconset) {
this._iconset.applyIcon(this, this._iconName, this.theme);
this.unlisten(window, 'iron-iconset-added', '_updateIcon');
} else {
this.listen(window, 'iron-iconset-added', '_updateIcon');
}
}
} else {
if (this._iconset) {
this._iconset.removeIcon(this);
}
if (!this._img) {
this._img = document.createElement('img');
this._img.style.width = '100%';
this._img.style.height = '100%';
this._img.draggable = false;
}
this._img.src = this.src;
Polymer.dom(this.root).appendChild(this._img);
}
}
});
Polymer.IronMenuBehaviorImpl = {
properties: {
focusedItem: {
observer: '_focusedItemChanged',
readOnly: true,
type: Object
},
attrForItemTitle: { type: String }
},
hostAttributes: {
'role': 'menu',
'tabindex': '0'
},
observers: ['_updateMultiselectable(multi)'],
listeners: {
'focus': '_onFocus',
'keydown': '_onKeydown',
'iron-items-changed': '_onIronItemsChanged'
},
keyBindings: {
'up': '_onUpKey',
'down': '_onDownKey',
'esc': '_onEscKey',
'shift+tab:keydown': '_onShiftTabDown'
},
attached: function () {
this._resetTabindices();
},
select: function (value) {
if (this._defaultFocusAsync) {
this.cancelAsync(this._defaultFocusAsync);
this._defaultFocusAsync = null;
}
var item = this._valueToItem(value);
if (item && item.hasAttribute('disabled'))
return;
this._setFocusedItem(item);
Polymer.IronMultiSelectableBehaviorImpl.select.apply(this, arguments);
},
_resetTabindices: function () {
var selectedItem = this.multi ? this.selectedItems && this.selectedItems[0] : this.selectedItem;
this.items.forEach(function (item) {
item.setAttribute('tabindex', item === selectedItem ? '0' : '-1');
}, this);
},
_updateMultiselectable: function (multi) {
if (multi) {
this.setAttribute('aria-multiselectable', 'true');
} else {
this.removeAttribute('aria-multiselectable');
}
},
_focusWithKeyboardEvent: function (event) {
for (var i = 0, item; item = this.items[i]; i++) {
var attr = this.attrForItemTitle || 'textContent';
var title = item[attr] || item.getAttribute(attr);
if (!item.hasAttribute('disabled') && title && title.trim().charAt(0).toLowerCase() === String.fromCharCode(event.keyCode).toLowerCase()) {
this._setFocusedItem(item);
break;
}
}
},
_focusPrevious: function () {
var length = this.items.length;
var curFocusIndex = Number(this.indexOf(this.focusedItem));
for (var i = 1; i < length; i++) {
var item = this.items[(curFocusIndex - i + length) % length];
if (!item.hasAttribute('disabled')) {
this._setFocusedItem(item);
return;
}
}
},
_focusNext: function () {
var length = this.items.length;
var curFocusIndex = Number(this.indexOf(this.focusedItem));
for (var i = 1; i < length; i++) {
var item = this.items[(curFocusIndex + i) % length];
if (!item.hasAttribute('disabled')) {
this._setFocusedItem(item);
return;
}
}
},
_applySelection: function (item, isSelected) {
if (isSelected) {
item.setAttribute('aria-selected', 'true');
} else {
item.removeAttribute('aria-selected');
}
Polymer.IronSelectableBehavior._applySelection.apply(this, arguments);
},
_focusedItemChanged: function (focusedItem, old) {
old && old.setAttribute('tabindex', '-1');
if (focusedItem) {
focusedItem.setAttribute('tabindex', '0');
focusedItem.focus();
}
},
_onIronItemsChanged: function (event) {
var mutations = event.detail;
var mutation;
var index;
for (index = 0; index < mutations.length; ++index) {
mutation = mutations[index];
if (mutation.addedNodes.length) {
this._resetTabindices();
break;
}
}
},
_onShiftTabDown: function (event) {
var oldTabIndex = this.getAttribute('tabindex');
Polymer.IronMenuBehaviorImpl._shiftTabPressed = true;
this._setFocusedItem(null);
this.setAttribute('tabindex', '-1');
this.async(function () {
this.setAttribute('tabindex', oldTabIndex);
Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;
}, 1);
},
_onFocus: function (event) {
if (Polymer.IronMenuBehaviorImpl._shiftTabPressed) {
return;
}
var rootTarget = Polymer.dom(event).rootTarget;
if (rootTarget !== this && typeof rootTarget.tabIndex !== 'undefined' && !this.isLightDescendant(rootTarget)) {
return;
}
this._defaultFocusAsync = this.async(function () {
var selectedItem = this.multi ? this.selectedItems && this.selectedItems[0] : this.selectedItem;
this._setFocusedItem(null);
if (selectedItem) {
this._setFocusedItem(selectedItem);
} else if (this.items[0]) {
this._focusNext();
}
});
},
_onUpKey: function (event) {
this._focusPrevious();
event.detail.keyboardEvent.preventDefault();
},
_onDownKey: function (event) {
this._focusNext();
event.detail.keyboardEvent.preventDefault();
},
_onEscKey: function (event) {
this.focusedItem.blur();
},
_onKeydown: function (event) {
if (!this.keyboardEventMatchesKeys(event, 'up down esc')) {
this._focusWithKeyboardEvent(event);
}
event.stopPropagation();
},
_activateHandler: function (event) {
Polymer.IronSelectableBehavior._activateHandler.call(this, event);
event.stopPropagation();
}
};
Polymer.IronMenuBehaviorImpl._shiftTabPressed = false;
Polymer.IronMenuBehavior = [
Polymer.IronMultiSelectableBehavior,
Polymer.IronA11yKeysBehavior,
Polymer.IronMenuBehaviorImpl
];
Polymer.IronMenubarBehaviorImpl = {
hostAttributes: { 'role': 'menubar' },
keyBindings: {
'left': '_onLeftKey',
'right': '_onRightKey'
},
_onUpKey: function (event) {
this.focusedItem.click();
event.detail.keyboardEvent.preventDefault();
},
_onDownKey: function (event) {
this.focusedItem.click();
event.detail.keyboardEvent.preventDefault();
},
get _isRTL() {
return window.getComputedStyle(this)['direction'] === 'rtl';
},
_onLeftKey: function (event) {
if (this._isRTL) {
this._focusNext();
} else {
this._focusPrevious();
}
event.detail.keyboardEvent.preventDefault();
},
_onRightKey: function (event) {
if (this._isRTL) {
this._focusPrevious();
} else {
this._focusNext();
}
event.detail.keyboardEvent.preventDefault();
},
_onKeydown: function (event) {
if (this.keyboardEventMatchesKeys(event, 'up down left right esc')) {
return;
}
this._focusWithKeyboardEvent(event);
}
};
Polymer.IronMenubarBehavior = [
Polymer.IronMenuBehavior,
Polymer.IronMenubarBehaviorImpl
];
Polymer.IronControlState = {
properties: {
focused: {
type: Boolean,
value: false,
notify: true,
readOnly: true,
reflectToAttribute: true
},
disabled: {
type: Boolean,
value: false,
notify: true,
observer: '_disabledChanged',
reflectToAttribute: true
},
_oldTabIndex: { type: Number },
_boundFocusBlurHandler: {
type: Function,
value: function () {
return this._focusBlurHandler.bind(this);
}
}
},
observers: ['_changedControlState(focused, disabled)'],
ready: function () {
this.addEventListener('focus', this._boundFocusBlurHandler, true);
this.addEventListener('blur', this._boundFocusBlurHandler, true);
},
_focusBlurHandler: function (event) {
if (event.target === this) {
this._setFocused(event.type === 'focus');
} else if (!this.shadowRoot && !this.isLightDescendant(event.target)) {
this.fire(event.type, { sourceEvent: event }, {
node: this,
bubbles: event.bubbles,
cancelable: event.cancelable
});
}
},
_disabledChanged: function (disabled, old) {
this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
this.style.pointerEvents = disabled ? 'none' : '';
if (disabled) {
this._oldTabIndex = this.tabIndex;
this.focused = false;
this.tabIndex = -1;
this.blur();
} else if (this._oldTabIndex !== undefined) {
this.tabIndex = this._oldTabIndex;
}
},
_changedControlState: function () {
if (this._controlStateChanged) {
this._controlStateChanged();
}
}
};
Polymer.IronButtonStateImpl = {
properties: {
pressed: {
type: Boolean,
readOnly: true,
value: false,
reflectToAttribute: true,
observer: '_pressedChanged'
},
toggles: {
type: Boolean,
value: false,
reflectToAttribute: true
},
active: {
type: Boolean,
value: false,
notify: true,
reflectToAttribute: true
},
pointerDown: {
type: Boolean,
readOnly: true,
value: false
},
receivedFocusFromKeyboard: {
type: Boolean,
readOnly: true
},
ariaActiveAttribute: {
type: String,
value: 'aria-pressed',
observer: '_ariaActiveAttributeChanged'
}
},
listeners: {
down: '_downHandler',
up: '_upHandler',
tap: '_tapHandler'
},
observers: [
'_detectKeyboardFocus(focused)',
'_activeChanged(active, ariaActiveAttribute)'
],
keyBindings: {
'enter:keydown': '_asyncClick',
'space:keydown': '_spaceKeyDownHandler',
'space:keyup': '_spaceKeyUpHandler'
},
_mouseEventRe: /^mouse/,
_tapHandler: function () {
if (this.toggles) {
this._userActivate(!this.active);
} else {
this.active = false;
}
},
_detectKeyboardFocus: function (focused) {
this._setReceivedFocusFromKeyboard(!this.pointerDown && focused);
},
_userActivate: function (active) {
if (this.active !== active) {
this.active = active;
this.fire('change');
}
},
_downHandler: function (event) {
this._setPointerDown(true);
this._setPressed(true);
this._setReceivedFocusFromKeyboard(false);
},
_upHandler: function () {
this._setPointerDown(false);
this._setPressed(false);
},
_spaceKeyDownHandler: function (event) {
var keyboardEvent = event.detail.keyboardEvent;
var target = Polymer.dom(keyboardEvent).localTarget;
if (this.isLightDescendant(target))
return;
keyboardEvent.preventDefault();
keyboardEvent.stopImmediatePropagation();
this._setPressed(true);
},
_spaceKeyUpHandler: function (event) {
var keyboardEvent = event.detail.keyboardEvent;
var target = Polymer.dom(keyboardEvent).localTarget;
if (this.isLightDescendant(target))
return;
if (this.pressed) {
this._asyncClick();
}
this._setPressed(false);
},
_asyncClick: function () {
this.async(function () {
this.click();
}, 1);
},
_pressedChanged: function (pressed) {
this._changedButtonState();
},
_ariaActiveAttributeChanged: function (value, oldValue) {
if (oldValue && oldValue != value && this.hasAttribute(oldValue)) {
this.removeAttribute(oldValue);
}
},
_activeChanged: function (active, ariaActiveAttribute) {
if (this.toggles) {
this.setAttribute(this.ariaActiveAttribute, active ? 'true' : 'false');
} else {
this.removeAttribute(this.ariaActiveAttribute);
}
this._changedButtonState();
},
_controlStateChanged: function () {
if (this.disabled) {
this._setPressed(false);
} else {
this._changedButtonState();
}
},
_changedButtonState: function () {
if (this._buttonStateChanged) {
this._buttonStateChanged();
}
}
};
Polymer.IronButtonState = [
Polymer.IronA11yKeysBehavior,
Polymer.IronButtonStateImpl
];
(function () {
var Utility = {
distance: function (x1, y1, x2, y2) {
var xDelta = x1 - x2;
var yDelta = y1 - y2;
return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
},
now: window.performance && window.performance.now ? window.performance.now.bind(window.performance) : Date.now
};
function ElementMetrics(element) {
this.element = element;
this.width = this.boundingRect.width;
this.height = this.boundingRect.height;
this.size = Math.max(this.width, this.height);
}
ElementMetrics.prototype = {
get boundingRect() {
return this.element.getBoundingClientRect();
},
furthestCornerDistanceFrom: function (x, y) {
var topLeft = Utility.distance(x, y, 0, 0);
var topRight = Utility.distance(x, y, this.width, 0);
var bottomLeft = Utility.distance(x, y, 0, this.height);
var bottomRight = Utility.distance(x, y, this.width, this.height);
return Math.max(topLeft, topRight, bottomLeft, bottomRight);
}
};
function Ripple(element) {
this.element = element;
this.color = window.getComputedStyle(element).color;
this.wave = document.createElement('div');
this.waveContainer = document.createElement('div');
this.wave.style.backgroundColor = this.color;
this.wave.classList.add('wave');
this.waveContainer.classList.add('wave-container');
Polymer.dom(this.waveContainer).appendChild(this.wave);
this.resetInteractionState();
}
Ripple.MAX_RADIUS = 300;
Ripple.prototype = {
get recenters() {
return this.element.recenters;
},
get center() {
return this.element.center;
},
get mouseDownElapsed() {
var elapsed;
if (!this.mouseDownStart) {
return 0;
}
elapsed = Utility.now() - this.mouseDownStart;
if (this.mouseUpStart) {
elapsed -= this.mouseUpElapsed;
}
return elapsed;
},
get mouseUpElapsed() {
return this.mouseUpStart ? Utility.now() - this.mouseUpStart : 0;
},
get mouseDownElapsedSeconds() {
return this.mouseDownElapsed / 1000;
},
get mouseUpElapsedSeconds() {
return this.mouseUpElapsed / 1000;
},
get mouseInteractionSeconds() {
return this.mouseDownElapsedSeconds + this.mouseUpElapsedSeconds;
},
get initialOpacity() {
return this.element.initialOpacity;
},
get opacityDecayVelocity() {
return this.element.opacityDecayVelocity;
},
get radius() {
var width2 = this.containerMetrics.width * this.containerMetrics.width;
var height2 = this.containerMetrics.height * this.containerMetrics.height;
var waveRadius = Math.min(Math.sqrt(width2 + height2), Ripple.MAX_RADIUS) * 1.1 + 5;
var duration = 1.1 - 0.2 * (waveRadius / Ripple.MAX_RADIUS);
var timeNow = this.mouseInteractionSeconds / duration;
var size = waveRadius * (1 - Math.pow(80, -timeNow));
return Math.abs(size);
},
get opacity() {
if (!this.mouseUpStart) {
return this.initialOpacity;
}
return Math.max(0, this.initialOpacity - this.mouseUpElapsedSeconds * this.opacityDecayVelocity);
},
get outerOpacity() {
var outerOpacity = this.mouseUpElapsedSeconds * 0.3;
var waveOpacity = this.opacity;
return Math.max(0, Math.min(outerOpacity, waveOpacity));
},
get isOpacityFullyDecayed() {
return this.opacity < 0.01 && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isRestingAtMaxRadius() {
return this.opacity >= this.initialOpacity && this.radius >= Math.min(this.maxRadius, Ripple.MAX_RADIUS);
},
get isAnimationComplete() {
return this.mouseUpStart ? this.isOpacityFullyDecayed : this.isRestingAtMaxRadius;
},
get translationFraction() {
return Math.min(1, this.radius / this.containerMetrics.size * 2 / Math.sqrt(2));
},
get xNow() {
if (this.xEnd) {
return this.xStart + this.translationFraction * (this.xEnd - this.xStart);
}
return this.xStart;
},
get yNow() {
if (this.yEnd) {
return this.yStart + this.translationFraction * (this.yEnd - this.yStart);
}
return this.yStart;
},
get isMouseDown() {
return this.mouseDownStart && !this.mouseUpStart;
},
resetInteractionState: function () {
this.maxRadius = 0;
this.mouseDownStart = 0;
this.mouseUpStart = 0;
this.xStart = 0;
this.yStart = 0;
this.xEnd = 0;
this.yEnd = 0;
this.slideDistance = 0;
this.containerMetrics = new ElementMetrics(this.element);
},
draw: function () {
var scale;
var translateString;
var dx;
var dy;
this.wave.style.opacity = this.opacity;
scale = this.radius / (this.containerMetrics.size / 2);
dx = this.xNow - this.containerMetrics.width / 2;
dy = this.yNow - this.containerMetrics.height / 2;
this.waveContainer.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
this.waveContainer.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
this.wave.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
this.wave.style.transform = 'scale3d(' + scale + ',' + scale + ',1)';
},
downAction: function (event) {
var xCenter = this.containerMetrics.width / 2;
var yCenter = this.containerMetrics.height / 2;
this.resetInteractionState();
this.mouseDownStart = Utility.now();
if (this.center) {
this.xStart = xCenter;
this.yStart = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
} else {
this.xStart = event ? event.detail.x - this.containerMetrics.boundingRect.left : this.containerMetrics.width / 2;
this.yStart = event ? event.detail.y - this.containerMetrics.boundingRect.top : this.containerMetrics.height / 2;
}
if (this.recenters) {
this.xEnd = xCenter;
this.yEnd = yCenter;
this.slideDistance = Utility.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
}
this.maxRadius = this.containerMetrics.furthestCornerDistanceFrom(this.xStart, this.yStart);
this.waveContainer.style.top = (this.containerMetrics.height - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.left = (this.containerMetrics.width - this.containerMetrics.size) / 2 + 'px';
this.waveContainer.style.width = this.containerMetrics.size + 'px';
this.waveContainer.style.height = this.containerMetrics.size + 'px';
},
upAction: function (event) {
if (!this.isMouseDown) {
return;
}
this.mouseUpStart = Utility.now();
},
remove: function () {
Polymer.dom(this.waveContainer.parentNode).removeChild(this.waveContainer);
}
};
Polymer({
is: 'paper-ripple',
behaviors: [Polymer.IronA11yKeysBehavior],
properties: {
initialOpacity: {
type: Number,
value: 0.25
},
opacityDecayVelocity: {
type: Number,
value: 0.8
},
recenters: {
type: Boolean,
value: false
},
center: {
type: Boolean,
value: false
},
ripples: {
type: Array,
value: function () {
return [];
}
},
animating: {
type: Boolean,
readOnly: true,
reflectToAttribute: true,
value: false
},
holdDown: {
type: Boolean,
value: false,
observer: '_holdDownChanged'
},
noink: {
type: Boolean,
value: false
},
_animating: { type: Boolean },
_boundAnimate: {
type: Function,
value: function () {
return this.animate.bind(this);
}
}
},
get target() {
var ownerRoot = Polymer.dom(this).getOwnerRoot();
var target;
if (this.parentNode.nodeType == 11) {
target = ownerRoot.host;
} else {
target = this.parentNode;
}
return target;
},
keyBindings: {
'enter:keydown': '_onEnterKeydown',
'space:keydown': '_onSpaceKeydown',
'space:keyup': '_onSpaceKeyup'
},
attached: function () {
this.keyEventTarget = this.target;
this.listen(this.target, 'up', 'uiUpAction');
this.listen(this.target, 'down', 'uiDownAction');
},
detached: function () {
this.unlisten(this.target, 'up', 'uiUpAction');
this.unlisten(this.target, 'down', 'uiDownAction');
},
get shouldKeepAnimating() {
for (var index = 0; index < this.ripples.length; ++index) {
if (!this.ripples[index].isAnimationComplete) {
return true;
}
}
return false;
},
simulatedRipple: function () {
this.downAction(null);
this.async(function () {
this.upAction();
}, 1);
},
uiDownAction: function (event) {
if (!this.noink) {
this.downAction(event);
}
},
downAction: function (event) {
if (this.holdDown && this.ripples.length > 0) {
return;
}
var ripple = this.addRipple();
ripple.downAction(event);
if (!this._animating) {
this.animate();
}
},
uiUpAction: function (event) {
if (!this.noink) {
this.upAction(event);
}
},
upAction: function (event) {
if (this.holdDown) {
return;
}
this.ripples.forEach(function (ripple) {
ripple.upAction(event);
});
this.animate();
},
onAnimationComplete: function () {
this._animating = false;
this.$.background.style.backgroundColor = null;
this.fire('transitionend');
},
addRipple: function () {
var ripple = new Ripple(this);
Polymer.dom(this.$.waves).appendChild(ripple.waveContainer);
this.$.background.style.backgroundColor = ripple.color;
this.ripples.push(ripple);
this._setAnimating(true);
return ripple;
},
removeRipple: function (ripple) {
var rippleIndex = this.ripples.indexOf(ripple);
if (rippleIndex < 0) {
return;
}
this.ripples.splice(rippleIndex, 1);
ripple.remove();
if (!this.ripples.length) {
this._setAnimating(false);
}
},
animate: function () {
var index;
var ripple;
this._animating = true;
for (index = 0; index < this.ripples.length; ++index) {
ripple = this.ripples[index];
ripple.draw();
this.$.background.style.opacity = ripple.outerOpacity;
if (ripple.isOpacityFullyDecayed && !ripple.isRestingAtMaxRadius) {
this.removeRipple(ripple);
}
}
if (!this.shouldKeepAnimating && this.ripples.length === 0) {
this.onAnimationComplete();
} else {
window.requestAnimationFrame(this._boundAnimate);
}
},
_onEnterKeydown: function () {
this.uiDownAction();
this.async(this.uiUpAction, 1);
},
_onSpaceKeydown: function () {
this.uiDownAction();
},
_onSpaceKeyup: function () {
this.uiUpAction();
},
_holdDownChanged: function (newVal, oldVal) {
if (oldVal === undefined) {
return;
}
if (newVal) {
this.downAction();
} else {
this.upAction();
}
}
});
}());
Polymer.PaperRippleBehavior = {
properties: {
noink: {
type: Boolean,
observer: '_noinkChanged'
},
_rippleContainer: { type: Object }
},
_buttonStateChanged: function () {
if (this.focused) {
this.ensureRipple();
}
},
_downHandler: function (event) {
Polymer.IronButtonStateImpl._downHandler.call(this, event);
if (this.pressed) {
this.ensureRipple(event);
}
},
ensureRipple: function (optTriggeringEvent) {
if (!this.hasRipple()) {
this._ripple = this._createRipple();
this._ripple.noink = this.noink;
var rippleContainer = this._rippleContainer || this.root;
if (rippleContainer) {
Polymer.dom(rippleContainer).appendChild(this._ripple);
}
if (optTriggeringEvent) {
var domContainer = Polymer.dom(this._rippleContainer || this);
var target = Polymer.dom(optTriggeringEvent).rootTarget;
if (domContainer.deepContains(target)) {
this._ripple.uiDownAction(optTriggeringEvent);
}
}
}
},
getRipple: function () {
this.ensureRipple();
return this._ripple;
},
hasRipple: function () {
return Boolean(this._ripple);
},
_createRipple: function () {
return document.createElement('paper-ripple');
},
_noinkChanged: function (noink) {
if (this.hasRipple()) {
this._ripple.noink = noink;
}
}
};
Polymer.PaperInkyFocusBehaviorImpl = {
observers: ['_focusedChanged(receivedFocusFromKeyboard)'],
_focusedChanged: function (receivedFocusFromKeyboard) {
if (receivedFocusFromKeyboard) {
this.ensureRipple();
}
if (this.hasRipple()) {
this._ripple.holdDown = receivedFocusFromKeyboard;
}
},
_createRipple: function () {
var ripple = Polymer.PaperRippleBehavior._createRipple();
ripple.id = 'ink';
ripple.setAttribute('center', '');
ripple.classList.add('circle');
return ripple;
}
};
Polymer.PaperInkyFocusBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperRippleBehavior,
Polymer.PaperInkyFocusBehaviorImpl
];
Polymer({
is: 'paper-icon-button',
hostAttributes: {
role: 'button',
tabindex: '0'
},
behaviors: [Polymer.PaperInkyFocusBehavior],
properties: {
src: { type: String },
icon: { type: String },
alt: {
type: String,
observer: '_altChanged'
}
},
_altChanged: function (newValue, oldValue) {
var label = this.getAttribute('aria-label');
if (!label || oldValue == label) {
this.setAttribute('aria-label', newValue);
}
}
});
Polymer({
is: 'iron-iconset-svg',
properties: {
name: {
type: String,
observer: '_nameChanged'
},
size: {
type: Number,
value: 24
}
},
attached: function () {
this.style.display = 'none';
},
getIconNames: function () {
this._icons = this._createIconMap();
return Object.keys(this._icons).map(function (n) {
return this.name + ':' + n;
}, this);
},
applyIcon: function (element, iconName) {
element = element.root || element;
this.removeIcon(element);
var svg = this._cloneIcon(iconName);
if (svg) {
var pde = Polymer.dom(element);
pde.insertBefore(svg, pde.childNodes[0]);
return element._svgIcon = svg;
}
return null;
},
removeIcon: function (element) {
if (element._svgIcon) {
Polymer.dom(element).removeChild(element._svgIcon);
element._svgIcon = null;
}
},
_nameChanged: function () {
new Polymer.IronMeta({
type: 'iconset',
key: this.name,
value: this
});
this.async(function () {
this.fire('iron-iconset-added', this, { node: window });
});
},
_createIconMap: function () {
var icons = Object.create(null);
Polymer.dom(this).querySelectorAll('[id]').forEach(function (icon) {
icons[icon.id] = icon;
});
return icons;
},
_cloneIcon: function (id) {
this._icons = this._icons || this._createIconMap();
return this._prepareSvgClone(this._icons[id], this.size);
},
_prepareSvgClone: function (sourceSvg, size) {
if (sourceSvg) {
var content = sourceSvg.cloneNode(true), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), viewBox = content.getAttribute('viewBox') || '0 0 ' + size + ' ' + size;
svg.setAttribute('viewBox', viewBox);
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
svg.style.cssText = 'pointer-events: none; display: block; width: 100%; height: 100%;';
svg.appendChild(content).removeAttribute('id');
return svg;
}
return null;
}
});
Polymer({
is: 'paper-tab',
behaviors: [
Polymer.IronControlState,
Polymer.IronButtonState,
Polymer.PaperRippleBehavior
],
properties: {
link: {
type: Boolean,
value: false,
reflectToAttribute: true
}
},
hostAttributes: { role: 'tab' },
listeners: {
down: '_updateNoink',
tap: '_onTap'
},
attached: function () {
this._updateNoink();
},
get _parentNoink() {
var parent = Polymer.dom(this).parentNode;
return !!parent && !!parent.noink;
},
_updateNoink: function () {
this.noink = !!this.noink || !!this._parentNoink;
},
_onTap: function (event) {
if (this.link) {
var anchor = this.queryEffectiveChildren('a');
if (!anchor) {
return;
}
if (event.target === anchor) {
return;
}
anchor.click();
}
}
});
Polymer({
is: 'paper-tabs',
behaviors: [
Polymer.IronResizableBehavior,
Polymer.IronMenubarBehavior
],
properties: {
noink: {
type: Boolean,
value: false,
observer: '_noinkChanged'
},
noBar: {
type: Boolean,
value: false
},
noSlide: {
type: Boolean,
value: false
},
scrollable: {
type: Boolean,
value: false
},
disableDrag: {
type: Boolean,
value: false
},
hideScrollButtons: {
type: Boolean,
value: false
},
alignBottom: {
type: Boolean,
value: false
},
selectable: {
type: String,
value: 'paper-tab'
},
autoselect: {
type: Boolean,
value: false
},
autoselectDelay: {
type: Number,
value: 0
},
_step: {
type: Number,
value: 10
},
_holdDelay: {
type: Number,
value: 1
},
_leftHidden: {
type: Boolean,
value: false
},
_rightHidden: {
type: Boolean,
value: false
},
_previousTab: { type: Object }
},
hostAttributes: { role: 'tablist' },
listeners: {
'iron-resize': '_onTabSizingChanged',
'iron-items-changed': '_onTabSizingChanged',
'iron-select': '_onIronSelect',
'iron-deselect': '_onIronDeselect'
},
keyBindings: { 'left:keyup right:keyup': '_onArrowKeyup' },
created: function () {
this._holdJob = null;
this._pendingActivationItem = undefined;
this._pendingActivationTimeout = undefined;
this._bindDelayedActivationHandler = this._delayedActivationHandler.bind(this);
this.addEventListener('blur', this._onBlurCapture.bind(this), true);
},
ready: function () {
this.setScrollDirection('y', this.$.tabsContainer);
},
detached: function () {
this._cancelPendingActivation();
},
_noinkChanged: function (noink) {
var childTabs = Polymer.dom(this).querySelectorAll('paper-tab');
childTabs.forEach(noink ? this._setNoinkAttribute : this._removeNoinkAttribute);
},
_setNoinkAttribute: function (element) {
element.setAttribute('noink', '');
},
_removeNoinkAttribute: function (element) {
element.removeAttribute('noink');
},
_computeScrollButtonClass: function (hideThisButton, scrollable, hideScrollButtons) {
if (!scrollable || hideScrollButtons) {
return 'hidden';
}
if (hideThisButton) {
return 'not-visible';
}
return '';
},
_computeTabsContentClass: function (scrollable) {
return scrollable ? 'scrollable' : 'horizontal';
},
_computeSelectionBarClass: function (noBar, alignBottom) {
if (noBar) {
return 'hidden';
} else if (alignBottom) {
return 'align-bottom';
}
return '';
},
_onTabSizingChanged: function () {
this.debounce('_onTabSizingChanged', function () {
this._scroll();
this._tabChanged(this.selectedItem);
}, 10);
},
_onIronSelect: function (event) {
this._tabChanged(event.detail.item, this._previousTab);
this._previousTab = event.detail.item;
this.cancelDebouncer('tab-changed');
},
_onIronDeselect: function (event) {
this.debounce('tab-changed', function () {
this._tabChanged(null, this._previousTab);
}, 1);
},
_activateHandler: function () {
this._cancelPendingActivation();
Polymer.IronMenuBehaviorImpl._activateHandler.apply(this, arguments);
},
_scheduleActivation: function (item, delay) {
this._pendingActivationItem = item;
this._pendingActivationTimeout = this.async(this._bindDelayedActivationHandler, delay);
},
_delayedActivationHandler: function () {
var item = this._pendingActivationItem;
this._pendingActivationItem = undefined;
this._pendingActivationTimeout = undefined;
item.fire(this.activateEvent, null, {
bubbles: true,
cancelable: true
});
},
_cancelPendingActivation: function () {
if (this._pendingActivationTimeout !== undefined) {
this.cancelAsync(this._pendingActivationTimeout);
this._pendingActivationItem = undefined;
this._pendingActivationTimeout = undefined;
}
},
_onArrowKeyup: function (event) {
if (this.autoselect) {
this._scheduleActivation(this.focusedItem, this.autoselectDelay);
}
},
_onBlurCapture: function (event) {
if (event.target === this._pendingActivationItem) {
this._cancelPendingActivation();
}
},
get _tabContainerScrollSize() {
return Math.max(0, this.$.tabsContainer.scrollWidth - this.$.tabsContainer.offsetWidth);
},
_scroll: function (e, detail) {
if (!this.scrollable) {
return;
}
var ddx = detail && -detail.ddx || 0;
this._affectScroll(ddx);
},
_down: function (e) {
this.async(function () {
if (this._defaultFocusAsync) {
this.cancelAsync(this._defaultFocusAsync);
this._defaultFocusAsync = null;
}
}, 1);
},
_affectScroll: function (dx) {
this.$.tabsContainer.scrollLeft += dx;
var scrollLeft = this.$.tabsContainer.scrollLeft;
this._leftHidden = scrollLeft === 0;
this._rightHidden = scrollLeft === this._tabContainerScrollSize;
},
_onLeftScrollButtonDown: function () {
this._scrollToLeft();
this._holdJob = setInterval(this._scrollToLeft.bind(this), this._holdDelay);
},
_onRightScrollButtonDown: function () {
this._scrollToRight();
this._holdJob = setInterval(this._scrollToRight.bind(this), this._holdDelay);
},
_onScrollButtonUp: function () {
clearInterval(this._holdJob);
this._holdJob = null;
},
_scrollToLeft: function () {
this._affectScroll(-this._step);
},
_scrollToRight: function () {
this._affectScroll(this._step);
},
_tabChanged: function (tab, old) {
if (!tab) {
this._positionBar(0, 0);
return;
}
var r = this.$.tabsContent.getBoundingClientRect();
var w = r.width;
var tabRect = tab.getBoundingClientRect();
var tabOffsetLeft = tabRect.left - r.left;
this._pos = {
width: this._calcPercent(tabRect.width, w),
left: this._calcPercent(tabOffsetLeft, w)
};
if (this.noSlide || old == null) {
this._positionBar(this._pos.width, this._pos.left);
return;
}
var oldRect = old.getBoundingClientRect();
var oldIndex = this.items.indexOf(old);
var index = this.items.indexOf(tab);
var m = 5;
this.$.selectionBar.classList.add('expand');
var moveRight = oldIndex < index;
var isRTL = this._isRTL;
if (isRTL) {
moveRight = !moveRight;
}
if (moveRight) {
this._positionBar(this._calcPercent(tabRect.left + tabRect.width - oldRect.left, w) - m, this._left);
} else {
this._positionBar(this._calcPercent(oldRect.left + oldRect.width - tabRect.left, w) - m, this._calcPercent(tabOffsetLeft, w) + m);
}
if (this.scrollable) {
this._scrollToSelectedIfNeeded(tabRect.width, tabOffsetLeft);
}
},
_scrollToSelectedIfNeeded: function (tabWidth, tabOffsetLeft) {
var l = tabOffsetLeft - this.$.tabsContainer.scrollLeft;
if (l < 0) {
this.$.tabsContainer.scrollLeft += l;
} else {
l += tabWidth - this.$.tabsContainer.offsetWidth;
if (l > 0) {
this.$.tabsContainer.scrollLeft += l;
}
}
},
_calcPercent: function (w, w0) {
return 100 * w / w0;
},
_positionBar: function (width, left) {
width = width || 0;
left = left || 0;
this._width = width;
this._left = left;
this.transform('translate3d(' + left + '%, 0, 0) scaleX(' + width / 100 + ')', this.$.selectionBar);
},
_onBarTransitionEnd: function (e) {
var cl = this.$.selectionBar.classList;
if (cl.contains('expand')) {
cl.remove('expand');
cl.add('contract');
this._positionBar(this._pos.width, this._pos.left);
} else if (cl.contains('contract')) {
cl.remove('contract');
}
}
});
Polymer({
is: 'iron-pages',
behaviors: [
Polymer.IronResizableBehavior,
Polymer.IronSelectableBehavior
],
properties: {
activateEvent: {
type: String,
value: null
}
},
observers: ['_selectedPageChanged(selected)'],
_selectedPageChanged: function (selected, old) {
this.async(this.notifyResize);
}
});
Polymer.IronValidatableBehavior = {
properties: {
validatorType: {
type: String,
value: 'validator'
},
validator: { type: String },
invalid: {
notify: true,
reflectToAttribute: true,
type: Boolean,
value: false
},
_validatorMeta: { type: Object }
},
observers: ['_invalidChanged(invalid)'],
get _validator() {
return this._validatorMeta && this._validatorMeta.byKey(this.validator);
},
ready: function () {
this._validatorMeta = new Polymer.IronMeta({ type: this.validatorType });
},
_invalidChanged: function () {
if (this.invalid) {
this.setAttribute('aria-invalid', 'true');
} else {
this.removeAttribute('aria-invalid');
}
},
hasValidator: function () {
return this._validator != null;
},
validate: function (value) {
this.invalid = !this._getValidity(value);
return !this.invalid;
},
_getValidity: function (value) {
if (this.hasValidator()) {
return this._validator.validate(value);
}
return true;
}
};
Polymer.IronFormElementBehavior = {
properties: {
name: { type: String },
value: {
notify: true,
type: String
},
required: {
type: Boolean,
value: false
},
_parentForm: { type: Object }
},
attached: function () {
this.fire('iron-form-element-register');
},
detached: function () {
if (this._parentForm) {
this._parentForm.fire('iron-form-element-unregister', { target: this });
}
}
};
Polymer.IronCheckedElementBehaviorImpl = {
properties: {
checked: {
type: Boolean,
value: false,
reflectToAttribute: true,
notify: true,
observer: '_checkedChanged'
},
toggles: {
type: Boolean,
value: true,
reflectToAttribute: true
},
value: {
type: String,
value: 'on',
observer: '_valueChanged'
}
},
observers: ['_requiredChanged(required)'],
created: function () {
this._hasIronCheckedElementBehavior = true;
},
_getValidity: function (_value) {
return this.disabled || !this.required || this.required && this.checked;
},
_requiredChanged: function () {
if (this.required) {
this.setAttribute('aria-required', 'true');
} else {
this.removeAttribute('aria-required');
}
},
_checkedChanged: function () {
this.active = this.checked;
this.fire('iron-change');
},
_valueChanged: function () {
if (this.value === undefined || this.value === null) {
this.value = 'on';
}
}
};
Polymer.IronCheckedElementBehavior = [
Polymer.IronFormElementBehavior,
Polymer.IronValidatableBehavior,
Polymer.IronCheckedElementBehaviorImpl
];
Polymer.PaperCheckedElementBehaviorImpl = {
_checkedChanged: function () {
Polymer.IronCheckedElementBehaviorImpl._checkedChanged.call(this);
if (this.hasRipple()) {
if (this.checked) {
this._ripple.setAttribute('checked', '');
} else {
this._ripple.removeAttribute('checked');
}
}
},
_buttonStateChanged: function () {
Polymer.PaperRippleBehavior._buttonStateChanged.call(this);
if (this.disabled) {
return;
}
if (this.isAttached) {
this.checked = this.active;
}
}
};
Polymer.PaperCheckedElementBehavior = [
Polymer.PaperInkyFocusBehavior,
Polymer.IronCheckedElementBehavior,
Polymer.PaperCheckedElementBehaviorImpl
];
Polymer({
is: 'paper-radio-button',
behaviors: [Polymer.PaperCheckedElementBehavior],
hostAttributes: {
role: 'radio',
'aria-checked': false,
tabindex: 0
},
properties: {
ariaActiveAttribute: {
type: String,
value: 'aria-checked'
}
},
ready: function () {
this._rippleContainer = this.$.radioContainer;
}
});
Polymer({
is: 'paper-radio-group',
behaviors: [
Polymer.IronA11yKeysBehavior,
Polymer.IronSelectableBehavior
],
hostAttributes: {
role: 'radiogroup',
tabindex: 0
},
properties: {
attrForSelected: {
type: String,
value: 'name'
},
selectedAttribute: {
type: String,
value: 'checked'
},
selectable: {
type: String,
value: 'paper-radio-button'
},
allowEmptySelection: {
type: Boolean,
value: false
}
},
keyBindings: {
'left up': 'selectPrevious',
'right down': 'selectNext'
},
select: function (value) {
if (this.selected) {
var oldItem = this._valueToItem(this.selected);
if (this.selected == value) {
if (this.allowEmptySelection) {
value = '';
} else {
if (oldItem)
oldItem.checked = true;
return;
}
}
if (oldItem)
oldItem.checked = false;
}
Polymer.IronSelectableBehavior.select.apply(this, [value]);
this.fire('paper-radio-group-changed');
},
selectPrevious: function () {
var length = this.items.length;
var newIndex = Number(this._valueToIndex(this.selected));
do {
newIndex = (newIndex - 1 + length) % length;
} while (this.items[newIndex].disabled);
this._itemActivate(this._indexToValue(newIndex), this.items[newIndex]);
},
selectNext: function () {
var length = this.items.length;
var newIndex = Number(this._valueToIndex(this.selected));
do {
newIndex = (newIndex + 1 + length) % length;
} while (this.items[newIndex].disabled);
this._itemActivate(this._indexToValue(newIndex), this.items[newIndex]);
}
});
Polymer({
is: 'paper-material',
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
value: 1
},
animated: {
type: Boolean,
reflectToAttribute: true,
value: false
}
}
});
Polymer.PaperButtonBehaviorImpl = {
properties: {
elevation: {
type: Number,
reflectToAttribute: true,
readOnly: true
}
},
observers: [
'_calculateElevation(focused, disabled, active, pressed, receivedFocusFromKeyboard)',
'_computeKeyboardClass(receivedFocusFromKeyboard)'
],
hostAttributes: {
role: 'button',
tabindex: '0',
animated: true
},
_calculateElevation: function () {
var e = 1;
if (this.disabled) {
e = 0;
} else if (this.active || this.pressed) {
e = 4;
} else if (this.receivedFocusFromKeyboard) {
e = 3;
}
this._setElevation(e);
},
_computeKeyboardClass: function (receivedFocusFromKeyboard) {
this.toggleClass('keyboard-focus', receivedFocusFromKeyboard);
},
_spaceKeyDownHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyDownHandler.call(this, event);
if (this.hasRipple() && this.getRipple().ripples.length < 1) {
this._ripple.uiDownAction();
}
},
_spaceKeyUpHandler: function (event) {
Polymer.IronButtonStateImpl._spaceKeyUpHandler.call(this, event);
if (this.hasRipple()) {
this._ripple.uiUpAction();
}
}
};
Polymer.PaperButtonBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperRippleBehavior,
Polymer.PaperButtonBehaviorImpl
];
Polymer({
is: 'paper-button',
behaviors: [Polymer.PaperButtonBehavior],
properties: {
raised: {
type: Boolean,
reflectToAttribute: true,
value: false,
observer: '_calculateElevation'
}
},
_calculateElevation: function () {
if (!this.raised) {
this._setElevation(0);
} else {
Polymer.PaperButtonBehaviorImpl._calculateElevation.apply(this);
}
}
});
function MakePromise(asap) {
function Promise(fn) {
if (typeof this !== 'object' || typeof fn !== 'function')
throw new TypeError();
this._state = null;
this._value = null;
this._deferreds = [];
doResolve(fn, resolve.bind(this), reject.bind(this));
}
function handle(deferred) {
var me = this;
if (this._state === null) {
this._deferreds.push(deferred);
return;
}
asap(function () {
var cb = me._state ? deferred.onFulfilled : deferred.onRejected;
if (typeof cb !== 'function') {
(me._state ? deferred.resolve : deferred.reject)(me._value);
return;
}
var ret;
try {
ret = cb(me._value);
} catch (e) {
deferred.reject(e);
return;
}
deferred.resolve(ret);
});
}
function resolve(newValue) {
try {
if (newValue === this)
throw new TypeError();
if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
var then = newValue.then;
if (typeof then === 'function') {
doResolve(then.bind(newValue), resolve.bind(this), reject.bind(this));
return;
}
}
this._state = true;
this._value = newValue;
finale.call(this);
} catch (e) {
reject.call(this, e);
}
}
function reject(newValue) {
this._state = false;
this._value = newValue;
finale.call(this);
}
function finale() {
for (var i = 0, len = this._deferreds.length; i < len; i++) {
handle.call(this, this._deferreds[i]);
}
this._deferreds = null;
}
function doResolve(fn, onFulfilled, onRejected) {
var done = false;
try {
fn(function (value) {
if (done)
return;
done = true;
onFulfilled(value);
}, function (reason) {
if (done)
return;
done = true;
onRejected(reason);
});
} catch (ex) {
if (done)
return;
done = true;
onRejected(ex);
}
}
Promise.prototype['catch'] = function (onRejected) {
return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
var me = this;
return new Promise(function (resolve, reject) {
handle.call(me, {
onFulfilled: onFulfilled,
onRejected: onRejected,
resolve: resolve,
reject: reject
});
});
};
Promise.resolve = function (value) {
if (value && typeof value === 'object' && value.constructor === Promise) {
return value;
}
return new Promise(function (resolve) {
resolve(value);
});
};
Promise.reject = function (value) {
return new Promise(function (resolve, reject) {
reject(value);
});
};
return Promise;
}
if (typeof module !== 'undefined') {
module.exports = MakePromise;
};
if (!window.Promise) {
window.Promise = MakePromise(Polymer.Base.async);
};
'use strict';
Polymer({
is: 'iron-request',
hostAttributes: { hidden: true },
properties: {
xhr: {
type: Object,
notify: true,
readOnly: true,
value: function () {
return new XMLHttpRequest();
}
},
response: {
type: Object,
notify: true,
readOnly: true,
value: function () {
return null;
}
},
status: {
type: Number,
notify: true,
readOnly: true,
value: 0
},
statusText: {
type: String,
notify: true,
readOnly: true,
value: ''
},
completes: {
type: Object,
readOnly: true,
notify: true,
value: function () {
return new Promise(function (resolve, reject) {
this.resolveCompletes = resolve;
this.rejectCompletes = reject;
}.bind(this));
}
},
progress: {
type: Object,
notify: true,
readOnly: true,
value: function () {
return {};
}
},
aborted: {
type: Boolean,
notify: true,
readOnly: true,
value: false
},
errored: {
type: Boolean,
notify: true,
readOnly: true,
value: false
},
timedOut: {
type: Boolean,
notify: true,
readOnly: true,
value: false
}
},
get succeeded() {
if (this.errored || this.aborted || this.timedOut) {
return false;
}
var status = this.xhr.status || 0;
return status === 0 || status >= 200 && status < 300;
},
send: function (options) {
var xhr = this.xhr;
if (xhr.readyState > 0) {
return null;
}
xhr.addEventListener('progress', function (progress) {
this._setProgress({
lengthComputable: progress.lengthComputable,
loaded: progress.loaded,
total: progress.total
});
}.bind(this));
xhr.addEventListener('error', function (error) {
this._setErrored(true);
this._updateStatus();
this.rejectCompletes(error);
}.bind(this));
xhr.addEventListener('timeout', function (error) {
this._setTimedOut(true);
this._updateStatus();
this.rejectCompletes(error);
}.bind(this));
xhr.addEventListener('abort', function () {
this._updateStatus();
this.rejectCompletes(new Error('Request aborted.'));
}.bind(this));
xhr.addEventListener('loadend', function () {
this._updateStatus();
if (!this.succeeded) {
this.rejectCompletes(new Error('The request failed with status code: ' + this.xhr.status));
return;
}
this._setResponse(this.parseResponse());
this.resolveCompletes(this);
}.bind(this));
this.url = options.url;
xhr.open(options.method || 'GET', options.url, options.async !== false);
var acceptType = {
'json': 'application/json',
'text': 'text/plain',
'html': 'text/html',
'xml': 'application/xml',
'arraybuffer': 'application/octet-stream'
}[options.handleAs];
var headers = options.headers || Object.create(null);
var newHeaders = Object.create(null);
for (var key in headers) {
newHeaders[key.toLowerCase()] = headers[key];
}
headers = newHeaders;
if (acceptType && !headers['accept']) {
headers['accept'] = acceptType;
}
Object.keys(headers).forEach(function (requestHeader) {
if (/[A-Z]/.test(requestHeader)) {
console.error('Headers must be lower case, got', requestHeader);
}
xhr.setRequestHeader(requestHeader, headers[requestHeader]);
}, this);
if (options.async !== false) {
var handleAs = options.handleAs;
if (!!options.jsonPrefix || !handleAs) {
handleAs = 'text';
}
xhr.responseType = xhr._responseType = handleAs;
if (!!options.jsonPrefix) {
xhr._jsonPrefix = options.jsonPrefix;
}
}
xhr.withCredentials = !!options.withCredentials;
xhr.timeout = options.timeout;
var body = this._encodeBodyObject(options.body, headers['content-type']);
xhr.send(body);
return this.completes;
},
parseResponse: function () {
var xhr = this.xhr;
var responseType = xhr.responseType || xhr._responseType;
var preferResponseText = !this.xhr.responseType;
var prefixLen = xhr._jsonPrefix && xhr._jsonPrefix.length || 0;
try {
switch (responseType) {
case 'json':
if (preferResponseText || xhr.response === undefined) {
try {
return JSON.parse(xhr.responseText);
} catch (_) {
return null;
}
}
return xhr.response;
case 'xml':
return xhr.responseXML;
case 'blob':
case 'document':
case 'arraybuffer':
return xhr.response;
case 'text':
default: {
if (prefixLen) {
try {
return JSON.parse(xhr.responseText.substring(prefixLen));
} catch (_) {
return null;
}
}
return xhr.responseText;
}
}
} catch (e) {
this.rejectCompletes(new Error('Could not parse response. ' + e.message));
}
},
abort: function () {
this._setAborted(true);
this.xhr.abort();
},
_encodeBodyObject: function (body, contentType) {
if (typeof body == 'string') {
return body;
}
var bodyObj = body;
switch (contentType) {
case 'application/json':
return JSON.stringify(bodyObj);
case 'application/x-www-form-urlencoded':
return this._wwwFormUrlEncode(bodyObj);
}
return body;
},
_wwwFormUrlEncode: function (object) {
if (!object) {
return '';
}
var pieces = [];
Object.keys(object).forEach(function (key) {
pieces.push(this._wwwFormUrlEncodePiece(key) + '=' + this._wwwFormUrlEncodePiece(object[key]));
}, this);
return pieces.join('&');
},
_wwwFormUrlEncodePiece: function (str) {
return encodeURIComponent(str.toString().replace(/\r?\n/g, '\r\n')).replace(/%20/g, '+');
},
_updateStatus: function () {
this._setStatus(this.xhr.status);
this._setStatusText(this.xhr.statusText === undefined ? '' : this.xhr.statusText);
}
});
'use strict';
Polymer({
is: 'iron-ajax',
hostAttributes: { hidden: true },
properties: {
url: { type: String },
params: {
type: Object,
value: function () {
return {};
}
},
method: {
type: String,
value: 'GET'
},
headers: {
type: Object,
value: function () {
return {};
}
},
contentType: {
type: String,
value: null
},
body: {
type: Object,
value: null
},
sync: {
type: Boolean,
value: false
},
handleAs: {
type: String,
value: 'json'
},
withCredentials: {
type: Boolean,
value: false
},
timeout: {
type: Number,
value: 0
},
auto: {
type: Boolean,
value: false
},
verbose: {
type: Boolean,
value: false
},
lastRequest: {
type: Object,
notify: true,
readOnly: true
},
loading: {
type: Boolean,
notify: true,
readOnly: true
},
lastResponse: {
type: Object,
notify: true,
readOnly: true
},
lastError: {
type: Object,
notify: true,
readOnly: true
},
activeRequests: {
type: Array,
notify: true,
readOnly: true,
value: function () {
return [];
}
},
debounceDuration: {
type: Number,
value: 0,
notify: true
},
jsonPrefix: {
type: String,
value: ''
},
bubbles: {
type: Boolean,
value: false
},
_boundHandleResponse: {
type: Function,
value: function () {
return this._handleResponse.bind(this);
}
}
},
observers: ['_requestOptionsChanged(url, method, params.*, headers, contentType, ' + 'body, sync, handleAs, jsonPrefix, withCredentials, timeout, auto)'],
get queryString() {
var queryParts = [];
var param;
var value;
for (param in this.params) {
value = this.params[param];
param = window.encodeURIComponent(param);
if (Array.isArray(value)) {
for (var i = 0; i < value.length; i++) {
queryParts.push(param + '=' + window.encodeURIComponent(value[i]));
}
} else if (value !== null) {
queryParts.push(param + '=' + window.encodeURIComponent(value));
} else {
queryParts.push(param);
}
}
return queryParts.join('&');
},
get requestUrl() {
var queryString = this.queryString;
if (queryString) {
var bindingChar = this.url.indexOf('?') >= 0 ? '&' : '?';
return this.url + bindingChar + queryString;
}
return this.url;
},
get requestHeaders() {
var headers = {};
var contentType = this.contentType;
if (contentType == null && typeof this.body === 'string') {
contentType = 'application/x-www-form-urlencoded';
}
if (contentType) {
headers['content-type'] = contentType;
}
var header;
if (this.headers instanceof Object) {
for (header in this.headers) {
headers[header] = this.headers[header].toString();
}
}
return headers;
},
toRequestOptions: function () {
return {
url: this.requestUrl || '',
method: this.method,
headers: this.requestHeaders,
body: this.body,
async: !this.sync,
handleAs: this.handleAs,
jsonPrefix: this.jsonPrefix,
withCredentials: this.withCredentials,
timeout: this.timeout
};
},
generateRequest: function () {
var request = document.createElement('iron-request');
var requestOptions = this.toRequestOptions();
this.activeRequests.push(request);
request.completes.then(this._boundHandleResponse).catch(this._handleError.bind(this, request)).then(this._discardRequest.bind(this, request));
request.send(requestOptions);
this._setLastRequest(request);
this._setLoading(true);
this.fire('request', {
request: request,
options: requestOptions
}, { bubbles: this.bubbles });
return request;
},
_handleResponse: function (request) {
if (request === this.lastRequest) {
this._setLastResponse(request.response);
this._setLastError(null);
this._setLoading(false);
}
this.fire('response', request, { bubbles: this.bubbles });
},
_handleError: function (request, error) {
if (this.verbose) {
console.error(error);
}
if (request === this.lastRequest) {
this._setLastError({
request: request,
error: error
});
this._setLastResponse(null);
this._setLoading(false);
}
this.fire('error', {
request: request,
error: error
}, { bubbles: this.bubbles });
},
_discardRequest: function (request) {
var requestIndex = this.activeRequests.indexOf(request);
if (requestIndex > -1) {
this.activeRequests.splice(requestIndex, 1);
}
},
_requestOptionsChanged: function () {
this.debounce('generate-request', function () {
if (this.url == null) {
return;
}
if (this.auto) {
this.generateRequest();
}
}, this.debounceDuration);
}
});
(function () {
var _data = {};
var _els = [];
var _generateMap = function (list) {
var out = {};
for (var i = 0; i < list.length; i++) {
out[list[i].name] = list[i];
}
return out;
};
var _setPackageData = function (data) {
_data = data || {};
if (data) {
_data.packageMap = _generateMap(data.packages);
_data.elementMap = _generateMap(data.elements);
_data.guideMap = _generateMap(data.guides);
_data.behaviorMap = {};
_data.elements.forEach(function (el) {
el.behaviors.forEach(function (be) {
_data.behaviorMap[be] = el.name;
});
});
}
_els.forEach(function (el) {
el.load(_data);
});
};
Polymer({
is: 'catalog-data',
ready: function () {
this.load(_data);
},
attached: function () {
if (_els.length === 0 && !_data.packages) {
this.$.req.generateRequest();
}
_els.push(this);
},
detached: function () {
_els.splice(_els.indexOf(this), 1);
},
properties: {
packages: {
type: Array,
readOnly: true,
notify: true
},
packageMap: {
type: Object,
readOnly: true,
notify: true
},
elements: {
type: Array,
readOnly: true,
notify: true
},
elementMap: {
type: Object,
readOnly: true,
notify: true
},
guides: {
type: Array,
readOnly: true,
notify: true
},
guideMap: {
type: Object,
readOnly: true,
notify: true
},
tags: {
type: Object,
readOnly: true,
notify: true
},
behaviorMap: {
type: Object,
readOnly: true,
notify: true
}
},
load: function (data) {
if (data.packages) {
this._setPackages(data.packages);
this._setPackageMap(data.packageMap);
this._setElements(data.elements);
this._setElementMap(data.elementMap);
this._setGuides(data.guides);
this._setGuideMap(data.guideMap);
this._setBehaviorMap(data.behaviorMap);
this._setTags(data.tags);
}
},
_handleResponse: function (_, req) {
_setPackageData(req.response);
}
});
}());
Polymer({
is: 'catalog-element',
properties: {
name: {
type: String,
notify: true
},
_elements: Object,
data: {
type: Object,
notify: true,
computed: 'getData(_elements,name)'
}
},
getData: function (_elements, name) {
if (!_elements)
return;
return _elements[name];
}
});
Polymer({
is: 'cart-item',
properties: { element: String },
_remove: function () {
this.fire('remove');
},
_nav: function (e) {
var view = e.currentTarget.getAttribute('view');
this.fire('nav', { url: '/elements/' + this.element.name + '?view=' + view });
}
});
(function () {
var _instances = [];
var _store = function () {
if (_instances.length) {
localStorage['catalog.cart'] = JSON.stringify(_instances[0].items);
}
};
var _retrieve = function () {
try {
return JSON.parse(localStorage['catalog.cart'] || '[]');
} catch (e) {
console.log('error retrieving catalog data from localstorage.', e);
return [];
}
};
var _add = function (name) {
var el = document.createElement('catalog-element');
el.name = name;
if (!el.data) {
return;
}
var check = _instances[0];
var insertAt;
if (check.items.length === 0 || check.items[0].name > name) {
insertAt = 0;
} else {
for (var i = 0; i < check.items.length; i++) {
if (name > check.items[i].name && (!check.items[i + 1] || name < check.items[i + 1].name)) {
insertAt = i + 1;
break;
}
}
}
_instances.forEach(function (instance) {
instance.splice('items', insertAt, 0, el.data);
instance.fire('item-added', {
name: el.name,
element: el.data
}, { bubbles: false });
});
_store();
return el.data;
};
var _remove = function (el) {
var check = _instances[0];
var removeAt = -1;
for (var i = 0; i < check.items.length; i++) {
if (check.items[i] === el || check.items[i].name === el) {
removeAt = i;
}
}
if (removeAt >= 0) {
_instances.forEach(function (instance) {
instance.splice('items', removeAt, 1);
instance.fire('item-removed', {
name: el.name,
element: el.data
}, { bubbles: false });
});
_store();
} else {
return false;
}
};
Polymer({
is: 'catalog-cart',
properties: {
items: {
type: Array,
notify: true,
value: function () {
return _retrieve();
}
}
},
created: function () {
_instances.push(this);
},
add: function (name) {
if (this.includes(name))
return false;
return _add(name);
},
remove: function (name) {
return _remove(name);
},
includes: function (el) {
for (var i = 0; i < this.items.length; i++) {
if (this.items[i] === el || this.items[i].name === el)
return true;
}
return false;
}
});
}());
Polymer({
is: 'app-cart',
enableCustomStyleProperties: true,
properties: {
items: {
type: Array,
notify: true
},
downloadMethod: {
type: String,
value: 'bower'
},
_tab: {
type: Number,
value: 0
}
},
log: function () {
console.log(arguments);
},
close: function () {
this.fire('cart-close');
},
add: function (name) {
if (this.includes(name)) {
this.fire('toast', { text: 'Element ' + name + ' is already in your collection' });
} else if (this.$.data.add(name)) {
this.fire('toast', { text: 'Element ' + name + ' has been added to your collection' });
}
},
remove: function (name) {
if (name.name)
name = name.name;
this.$.data.remove(name);
this.fire('toast', { text: 'Element ' + name + ' has been removed from your collection' });
},
_hasAny: function (arr) {
return arr && arr > 0;
},
_handleRemove: function (e) {
this.remove(e.currentTarget.element);
},
includes: function (el) {
return this.$.data.includes(el);
},
_itemsAsDependencies: function () {
var out = {};
this.items.forEach(function (item) {
out[item.name] = item.source + '#' + item.target;
});
return out;
},
_itemsAsQueryString: function () {
return this.items.map(function (item) {
return item.name + '=' + encodeURIComponent(item.source + '#' + item.target);
}).join('&');
},
_itemsAsBowerCommand: function () {
return 'bower install --save ' + this.items.map(function (item) {
if (item) {
return item.source + '#' + item.target;
}
}).join(' ');
},
_selectAll: function (e) {
e.currentTarget.select();
},
bowerString: function () {
return JSON.stringify({
name: 'polymer-project',
dependencies: this._itemsAsDependencies()
}, null, 2);
},
zipUrl: function () {
return 'http://bowerarchiver.appspot.com/archive?' + this._itemsAsQueryString();
},
download: function () {
var link = document.createElement('a');
ga('send', 'event', 'download');
switch (this.downloadMethod) {
case 'bower':
var blob = new Blob([this.bowerString()], { type: 'application/json' });
var url = URL.createObjectURL(blob);
link.href = url;
link.download = 'bower.json';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
break;
case 'elements':
link.href = this.zipUrl();
link.download = 'elements.zip';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
break;
}
}
});
Polymer({
is: 'app-bar',
properties: {
query: {
type: String,
notify: true
},
showingSearch: {
type: Boolean,
value: false
},
noSearch: {
type: Boolean,
value: false
}
},
observers: ['updateSearchDisplay(showingSearch)'],
listeners: { keyup: 'hotkeys' },
toggleSearch: function (e) {
if (e) {
e.stopPropagation();
}
if (e.target === this.$.query) {
return;
}
this.showingSearch = !this.showingSearch;
},
clearSearch: function () {
this.showingSearch = false;
},
updateSearchDisplay: function (showingSearch) {
if (showingSearch) {
this.classList.add('search-on');
this.async(function () {
this.$.query.focus();
});
} else {
this.classList.remove('search-on');
}
},
hotkeys: function (e) {
if (e.keyCode === 27 && Polymer.dom(e).rootTarget === this.$.query) {
this.showingSearch = false;
}
},
performSearch: function (e) {
e.preventDefault();
this.fire('nav', { url: '/browse?q=' + this.query });
}
});
Polymer({
is: 'app-sidebar',
enableCustomStyleProperties: true
});
Polymer({
is: 'catalog-package',
properties: {
name: {
type: String,
notify: true
},
_packages: {
type: Object,
notify: true
},
data: {
type: Object,
notify: true,
computed: 'getData(_packages,name)'
}
},
getData: function (_packages, name) {
if (!_packages)
return;
return _packages[name];
}
});
(function (e, t, n, r, i, s, o) {
function d(r) {
if (Object.prototype.toString.apply(r) === '[object Array]') {
if (typeof r[0] == 'string' && typeof d[r[0]] == 'function')
return new d[r[0]](r.slice(1, r.length));
if (r.length === 4)
return new d.RGB(r[0] / 255, r[1] / 255, r[2] / 255, r[3] / 255);
} else if (typeof r == 'string') {
var i = r.toLowerCase();
a[i] && (r = '#' + a[i]), i === 'transparent' && (r = 'rgba(0,0,0,0)');
var s = r.match(p);
if (s) {
var o = s[1].toUpperCase(), u = f(s[8]) ? s[8] : t(s[8]), l = o[0] === 'H', h = s[3] ? 100 : l ? 360 : 255, v = s[5] || l ? 100 : 255, m = s[7] || l ? 100 : 255;
if (f(d[o]))
throw new Error('one.color.' + o + ' is not installed.');
return new d[o](t(s[2]) / h, t(s[4]) / v, t(s[6]) / m, u);
}
r.length < 6 && (r = r.replace(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i, '$1$1$2$2$3$3'));
var g = r.match(/^#?([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])$/i);
if (g)
return new d.RGB(n(g[1], 16) / 255, n(g[2], 16) / 255, n(g[3], 16) / 255);
if (d.CMYK) {
var y = r.match(new e('^cmyk\\(' + c.source + ',' + c.source + ',' + c.source + ',' + c.source + '\\)$', 'i'));
if (y)
return new d.CMYK(t(y[1]) / 100, t(y[2]) / 100, t(y[3]) / 100, t(y[4]) / 100);
}
} else if (typeof r == 'object' && r.isColor)
return r;
return !1;
}
function v(e, t, n) {
function l(e, t) {
var n = {};
n[t.toLowerCase()] = new r('return this.rgb().' + t.toLowerCase() + '();'), d[t].propertyNames.forEach(function (e, i) {
n[e] = n[e === 'black' ? 'k' : e[0]] = new r('value', 'isDelta', 'return this.' + t.toLowerCase() + '().' + e + '(value, isDelta);');
});
for (var i in n)
n.hasOwnProperty(i) && d[e].prototype[i] === undefined && (d[e].prototype[i] = n[i]);
}
d[e] = new r(t.join(','), 'if (Object.prototype.toString.apply(' + t[0] + ') === \'[object Array]\') {' + t.map(function (e, n) {
return e + '=' + t[0] + '[' + n + '];';
}).reverse().join('') + '}' + 'if (' + t.filter(function (e) {
return e !== 'alpha';
}).map(function (e) {
return 'isNaN(' + e + ')';
}).join('||') + '){' + 'throw new Error("[' + e + ']: Invalid color: ("+' + t.join('+","+') + '+")");}' + t.map(function (e) {
return e === 'hue' ? 'this._hue=hue<0?hue-Math.floor(hue):hue%1' : e === 'alpha' ? 'this._alpha=(isNaN(alpha)||alpha>1)?1:(alpha<0?0:alpha);' : 'this._' + e + '=' + e + '<0?0:(' + e + '>1?1:' + e + ')';
}).join(';') + ';'), d[e].propertyNames = t;
var s = d[e].prototype;
[
'valueOf',
'hex',
'hexa',
'css',
'cssa'
].forEach(function (t) {
s[t] = s[t] || (e === 'RGB' ? s.hex : new r('return this.rgb().' + t + '();'));
}), s.isColor = !0, s.equals = function (n, r) {
f(r) && (r = 1e-10), n = n[e.toLowerCase()]();
for (var s = 0; s < t.length; s += 1)
if (i.abs(this['_' + t[s]] - n['_' + t[s]]) > r)
return !1;
return !0;
}, s.toJSON = new r('return [\'' + e + '\', ' + t.map(function (e) {
return 'this._' + e;
}, this).join(', ') + '];');
for (var o in n)
if (n.hasOwnProperty(o)) {
var a = o.match(/^from(.*)$/);
a ? d[a[1].toUpperCase()].prototype[e.toLowerCase()] = n[o] : s[o] = n[o];
}
s[e.toLowerCase()] = function () {
return this;
}, s.toString = new r('return "[one.color.' + e + ':"+' + t.map(function (e, n) {
return '" ' + t[n] + '="+this._' + e;
}).join('+') + '+"]";'), t.forEach(function (e, n) {
s[e] = s[e === 'black' ? 'k' : e[0]] = new r('value', 'isDelta', 'if (typeof value === \'undefined\') {return this._' + e + ';' + '}' + 'if (isDelta) {' + 'return new this.constructor(' + t.map(function (t, n) {
return 'this._' + t + (e === t ? '+value' : '');
}).join(', ') + ');' + '}' + 'return new this.constructor(' + t.map(function (t, n) {
return e === t ? 'value' : 'this._' + t;
}).join(', ') + ');');
}), u.forEach(function (t) {
l(e, t), l(t, e);
}), u.push(e);
}
var u = [], a = {}, f = function (e) {
return typeof e == 'undefined';
}, l = /\s*(\.\d+|\d+(?:\.\d+)?)(%)?\s*/, c = /\s*(\.\d+|100|\d?\d(?:\.\d+)?)%\s*/, h = /\s*(\.\d+|\d+(?:\.\d+)?)\s*/, p = new e('^(rgb|hsl|hsv)a?\\(' + l.source + ',' + l.source + ',' + l.source + '(?:,' + h.source + ')?' + '\\)$', 'i');
d.installMethod = function (e, t) {
u.forEach(function (n) {
d[n].prototype[e] = t;
});
}, v('RGB', [
'red',
'green',
'blue',
'alpha'
], {
hex: function () {
var e = (s(255 * this._red) * 65536 + s(255 * this._green) * 256 + s(255 * this._blue)).toString(16);
return '#' + '00000'.substr(0, 6 - e.length) + e;
},
hexa: function () {
var e = s(this._alpha * 255).toString(16);
return '#' + '00'.substr(0, 2 - e.length) + e + this.hex().substr(1, 6);
},
css: function () {
return 'rgb(' + s(255 * this._red) + ',' + s(255 * this._green) + ',' + s(255 * this._blue) + ')';
},
cssa: function () {
return 'rgba(' + s(255 * this._red) + ',' + s(255 * this._green) + ',' + s(255 * this._blue) + ',' + this._alpha + ')';
}
}), typeof define == 'function' && !f(define.amd) ? define(function () {
return d;
}) : typeof exports == 'object' ? module.exports = d : (one = window.one || {}, one.color = d), typeof jQuery != 'undefined' && f(jQuery.color) && (jQuery.color = d), v('HSV', [
'hue',
'saturation',
'value',
'alpha'
], {
rgb: function () {
var e = this._hue, t = this._saturation, n = this._value, r = o(5, i.floor(e * 6)), s = e * 6 - r, u = n * (1 - t), a = n * (1 - s * t), f = n * (1 - (1 - s) * t), l, c, h;
switch (r) {
case 0:
l = n, c = f, h = u;
break;
case 1:
l = a, c = n, h = u;
break;
case 2:
l = u, c = n, h = f;
break;
case 3:
l = u, c = a, h = n;
break;
case 4:
l = f, c = u, h = n;
break;
case 5:
l = n, c = u, h = a;
}
return new d.RGB(l, c, h, this._alpha);
},
hsl: function () {
var e = (2 - this._saturation) * this._value, t = this._saturation * this._value, n = e <= 1 ? e : 2 - e, r;
return n < 1e-9 ? r = 0 : r = t / n, new d.HSL(this._hue, r, e / 2, this._alpha);
},
fromRgb: function () {
var e = this._red, t = this._green, n = this._blue, r = i.max(e, t, n), s = o(e, t, n), u = r - s, a, f = r === 0 ? 0 : u / r, l = r;
if (u === 0)
a = 0;
else
switch (r) {
case e:
a = (t - n) / u / 6 + (t < n ? 1 : 0);
break;
case t:
a = (n - e) / u / 6 + 1 / 3;
break;
case n:
a = (e - t) / u / 6 + 2 / 3;
}
return new d.HSV(a, f, l, this._alpha);
}
}), v('HSL', [
'hue',
'saturation',
'lightness',
'alpha'
], {
hsv: function () {
var e = this._lightness * 2, t = this._saturation * (e <= 1 ? e : 2 - e), n;
return e + t < 1e-9 ? n = 0 : n = 2 * t / (e + t), new d.HSV(this._hue, n, (e + t) / 2, this._alpha);
},
rgb: function () {
return this.hsv().rgb();
},
fromRgb: function () {
return this.hsv().hsl();
}
});
}(RegExp, parseFloat, parseInt, Function, Math, Math.round, Math.min));
Polymer({
is: 'theme-color',
properties: {
color: {
type: String,
notify: true
},
textColor: {
type: String,
notify: true,
computed: 'computeTextColor(color)'
},
outline: { type: Boolean }
},
observers: ['colorContent(color)'],
computeTextColor: function (color) {
if (this.color) {
var lightness = one.color(this.color).lightness();
return lightness > 0.5 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
} else {
return null;
}
},
_color: function (node, bgColor, color) {
node.style.color = color;
node.style.backgroundColor = bgColor;
if (this.outline)
this._outline(node, bgColor);
},
_colorBorder: function (node, borderColor) {
node.style.borderColor = borderColor;
},
_outline: function (node, bgColor) {
if (one.color(bgColor).lightness() > 0.9) {
node.style.outline = '1px solid rgba(0,0,0,.25)';
node.style.outlineOffset = '-1px';
}
},
colorContent: function () {
if (this.hasAttribute('themed'))
this._color(this, this.color, this.textColor);
if (this.hasAttribute('themed-reverse'))
this._color(this, this.textColor, this.color);
if (this.hasAttribute('themed-border'))
this._colorBorder(this, this.color);
if (this.hasAttribute('themed-border-reverse'))
this._colorBorder(this, this.textColor);
var nodes = Polymer.dom(this).querySelectorAll('[themed],[themed-reverse],[themed-border],[themed-border-reverse]');
for (var i = 0; i < nodes.length; i++) {
if (nodes[i].hasAttribute('themed')) {
this._color(nodes[i], this.color, this.textColor);
} else if (nodes[i].hasAttribute('themed-reverse')) {
this._color(nodes[i], this.textColor, this.color);
} else if (nodes[i].hasAttribute('themed-border')) {
this._colorBorder(nodes[i], this.color);
} else if (nodes[i].hasAttribute('themed-border-reverse')) {
this._colorBorder(nodes[i], this.textColor);
}
}
}
});
Polymer({
is: 'package-tile',
enableCustomStyleProperties: true,
properties: {
name: {
type: String,
notify: true
},
package: { type: Object }
},
attached: function () {
var tiles = this.parentNode.querySelectorAll('package-tile');
var index = Array.prototype.indexOf.call(tiles, this);
setTimeout(function () {
this.classList.add('active');
}.bind(this), (index + 1) * 50);
},
_extendedTitle: function (p) {
if (p.title.length > 20)
return true;
}
});
Polymer({
is: 'catalog-guide',
properties: {
name: {
type: String,
notify: true
},
_guides: {
type: Object,
notify: true
},
data: {
type: Object,
notify: true,
computed: 'getData(_guides,name)'
},
src: {
type: String,
notify: true,
computed: 'getSrc(name)'
},
content: {
type: String,
notify: true
}
},
getData: function (_guides, name) {
if (!_guides)
return;
return _guides[name];
},
getSrc: function (name) {
return '/data/guides/' + name + '.html';
},
_didReceiveError: function (e) {
this.fire('catalog-guide-error', e.detail);
}
});
Polymer({
is: 'guide-card',
enableCustomStyleProperties: true,
properties: {
guide: {
type: String,
notify: true
},
_guide: Object
}
});
Polymer({
is: 'cart-icon',
listeners: { tap: 'openCart' },
observers: ['_anyItems(cartItems.length)'],
openCart: function () {
this.fire('cart-open');
},
_anyItems: function () {
if (this.cartItems.length >= 1) {
this.classList.add('full');
} else {
this.classList.remove('full');
}
},
_pulse: function () {
this.classList.remove('pulse');
this.async(function () {
this.classList.add('pulse');
});
},
_shrink: function () {
}
});
Polymer({
is: 'page-packages',
enableCustomStyleProperties: true,
properties: {
q: {
type: String,
notify: true
}
},
attached: function () {
this.fire('page-meta', { title: null });
},
observers: ['search(q)'],
search: function (q) {
if (q || this.q) {
this.router.go('/browse?q=' + (q || this.q));
}
},
_link: function () {
return '/' + Array.prototype.slice.call(arguments).join('/');
},
_packageLink: function (name) {
return '/browse?package=' + name;
},
guideSelect: function (e) {
this.router.go('/guides/' + e.currentTarget.guide);
}
});
Polymer({
is: 'package-symbol',
properties: {
symbol: String,
color: String
},
_getComputedStyle: function (color) {
return 'background-color: ' + color + ';';
}
});
Polymer({
is: 'tag-link',
enableCustomStyleProperties: true,
properties: {
name: {
type: String,
notify: true,
reflectToAttribute: true,
observer: 'convert'
}
},
convert: function () {
if (typeof this.name === 'object') {
this.name = this.name.valueOf();
}
}
});
Polymer({
is: 'element-action-menu',
properties: {
element: String,
_element: Object,
iconsOnly: {
type: Boolean,
value: false,
reflectToAttribute: true
}
},
githubLink: function (source) {
return 'https://github.com/' + source;
},
cartAdd: function (e) {
e.stopPropagation();
e.preventDefault();
this.$.cartItemIcon.toggle();
},
navToDocs: function (e) {
e.stopPropagation();
e.preventDefault();
this.fire('nav', { url: '/elements/' + this.element + '?view=docs' });
},
navToDemo: function (e) {
e.stopPropagation();
e.preventDefault();
if (e.currentTarget.hasAttribute('disabled'))
return false;
this.fire('nav', { url: '/elements/' + this.element + '?active=' + this._element.active + '&view=demo:' + this._element.demo.path });
}
});
Polymer({
is: 'element-table',
properties: {
elements: {
type: Array,
observer: '_elementsChanged'
},
color: { type: String },
narrowViewport: {
type: Boolean,
reflectToAttribute: true
}
},
listeners: {
'tap': '_tap',
'mouseover': '_mouseOver',
'mouseleave': '_mouseLeave'
},
_currentRowIndex: -1,
_sharedActionMenu: null,
_findAncestor: function (node, fn) {
while (node && fn.call(this, node)) {
node = node.parentNode;
}
return node;
},
_tap: function (e) {
var sourceEvent = e.detail.sourceEvent;
var A = this._findAncestor(e.target, function (node) {
return node != this && node.tagName !== 'A';
});
if (A && A.tagName === 'A' && A.href.indexOf(location.host) > 0) {
if (sourceEvent.ctrlKey || sourceEvent.metaKey) {
window.open(A.href);
} else {
this.fire('nav', { url: A.href });
}
e.preventDefault();
}
},
_mouseOver: function (e) {
var row = this._findAncestor(e.target, function (node) {
return node != this && !node.classList.contains('row') && node.id !== 'actions';
});
if (row && row.classList.contains('row')) {
if (this._currentRowIndex != row.dataset.index) {
this._hideActions();
this._showActions(row, row.dataset.index);
}
} else if (row.id !== 'actions') {
this._hideActions();
}
},
_mouseLeave: function () {
this._hideActions();
},
_showActions: function (row, index) {
var sharedActionMenu = this._sharedActionMenu;
var rowOffsetTop = row.offsetTop;
if (!sharedActionMenu) {
this._sharedActionMenu = document.createElement('element-action-menu');
this._sharedActionMenu.classList.add('hidden');
Polymer.dom(this.$.actions).appendChild(this._sharedActionMenu);
sharedActionMenu = this._sharedActionMenu;
}
sharedActionMenu.iconsOnly = true;
sharedActionMenu.element = this.elements[index].name;
sharedActionMenu.style.top = rowOffsetTop + 'px';
this._layoutIfNeeded(sharedActionMenu);
sharedActionMenu.classList.remove('hidden');
row.classList.add('hover');
this._currentRowIndex = index;
this._currentRow = row;
},
_hideActions: function () {
var row = this._currentRow;
var sharedActionMenu = this._sharedActionMenu;
if (row) {
if (sharedActionMenu) {
sharedActionMenu.classList.add('hidden');
}
row.classList.remove('hover');
this._currentRowIndex = -1;
this._currentRow = null;
}
},
_elementLink: function (name) {
return '/elements/' + name;
},
_getHeaderStyle: function (color) {
return 'background-color: ' + color + ';';
},
_elementsChanged: function () {
this.classList.add('hidden');
this.async(function () {
this.classList.remove('hidden');
}, 1);
},
_layoutIfNeeded: function (el) {
return el.offsetTop;
}
});
(function () {
var sharedActionMenu = null;
var activeCard = null;
function mouseEnter() {
if (activeCard) {
activeCard.showActions();
}
}
function mouseLeave() {
if (activeCard) {
activeCard.hideActions();
}
}
Polymer({
is: 'element-card',
enableCustomStyleProperties: true,
properties: {
item: Object,
color: String,
packageSymbol: String
},
observers: ['_updatePackage(_element)'],
attached: function () {
this.style.opacity = 0;
this.async(function () {
this.style.opacity = 1;
}, 1);
},
detached: function () {
if (activeCard === this) {
activeCard = null;
if (sharedActionMenu) {
Polymer.dom(this.parentNode).removeChild(sharedActionMenu);
sharedActionMenu = null;
}
}
},
_tagClicked: function (e) {
e.stopPropagation();
this.fire('update-params', { tag: e.currentTarget.name });
},
_computeStyle: function (color) {
return 'background-color:' + color;
},
_getElementLink: function (elementName) {
return '/elements/' + elementName;
},
_getImageSrc: function (src) {
return src && src.length ? src : '/images/hero/random-' + Math.ceil(Math.random() * 4) + '.svg';
},
_getPackageLink: function (packageName) {
return '/browse?package=' + packageName + '&view=cards';
},
_getTagLink: function (packageName, tag) {
return '/browse?tag=' + tag + '&view=cards';
},
showActions: function () {
var top = this.$.hero.offsetTop;
var left = this.$.hero.offsetLeft;
var width = this.$.hero.offsetWidth;
if (!sharedActionMenu) {
sharedActionMenu = document.createElement('element-action-menu');
sharedActionMenu.classList.add('cards');
sharedActionMenu.classList.add('hidden');
sharedActionMenu.addEventListener('mouseenter', mouseEnter);
sharedActionMenu.addEventListener('mouseleave', mouseLeave);
}
if (!sharedActionMenu.parentNode) {
Polymer.dom(this.parentNode).appendChild(sharedActionMenu);
}
top += this.$.hero.offsetHeight - sharedActionMenu.offsetHeight;
sharedActionMenu.element = this.item.name;
sharedActionMenu.style.top = top + 'px';
sharedActionMenu.style.left = left + 'px';
sharedActionMenu.style.width = width + 'px';
this._layoutIfNeeded(sharedActionMenu);
sharedActionMenu.classList.remove('hidden');
this.classList.add('hover');
sharedActionMenu.cancelDebouncer('hide');
},
hideActions: function () {
if (sharedActionMenu && sharedActionMenu.element == this.item.name) {
sharedActionMenu.debounce('hide', function () {
sharedActionMenu.classList.add('hidden');
}, 10);
this.classList.remove('hover');
}
},
_mouseEnter: function () {
activeCard = this;
mouseEnter();
},
_mouseLeave: function (e) {
mouseLeave();
},
_layoutIfNeeded: function (el) {
return el.offsetTop;
}
});
}());
Polymer({
is: 'element-table-cards',
properties: {
packages: { type: Array },
elements: { type: Array }
},
observers: ['_render(elements, packages, isAttached)'],
_findAncestor: function (node, fn) {
while (node && fn.call(this, node)) {
node = node.parentNode;
}
return node;
},
_tap: function (e) {
var sourceEvent = e.detail.sourceEvent;
var A = this._findAncestor(e.target, function (node) {
return node != this && node.tagName !== 'A';
});
if (A && A.tagName === 'A' && A.href.indexOf(location.host) > 0) {
if (sourceEvent.ctrlKey || sourceEvent.metaKey) {
window.open(A.href);
} else {
this.fire('nav', { url: A.href });
}
e.preventDefault();
}
},
_getColor: function (item) {
return this.packages[item.package].color;
},
_getPackageSymbol: function (item) {
return this.packages[item.package].symbol;
},
_render: function (elements, packages) {
if (elements) {
this.$.cards.innerHTML = '';
var head = 0;
var batchSize = 3;
var flush = function () {
if (head + batchSize >= elements.length) {
batchSize = elements.length - head;
}
if (batchSize <= 0) {
return false;
}
var el;
var firstHead = head;
var lastHead = firstHead + batchSize;
for (; head < lastHead; head++) {
el = document.createElement('element-card');
el.item = elements[head];
el.color = packages[el.item.package].color;
el.packageSymbol = packages[el.item.package].symbol;
Polymer.dom(this.$.cards).appendChild(el);
}
return true;
};
var batch = function () {
if (flush.call(this)) {
batchSize = 10;
requestAnimationFrame(batch.bind(this));
}
};
batch.call(this);
}
}
});
(function () {
var _els = [];
var _lastRecalc = new Date().getTime();
var _recalc = function () {
for (var i = 0; i < _els.length; i++) {
_els[i].recalc();
}
};
Polymer({
is: 'responsive-element',
properties: {
size: {
type: String,
readOnly: true,
reflectToAttribute: true
},
s: {
type: Number,
value: 768
},
m: {
type: Number,
value: 992
},
l: {
type: Number,
value: 1200
},
xl: {
type: Number,
value: 1600
}
},
attached: function () {
_els.push(this);
this.recalc();
},
detached: function () {
_els.splice(_els.indexOf(this), 1);
},
recalc: function () {
var w = this.getBoundingClientRect().width;
if (w < this.s) {
this._setSize('xs');
} else if (w < this.m) {
this._setSize('s');
} else if (w < this.l) {
this._setSize('m');
} else if (w < this.xl) {
this._setSize('l');
} else {
this._setSize('xl');
}
}
});
var _debounce = function (func, wait, immediate) {
var timeout;
return function () {
var context = this, args = arguments;
var later = function () {
timeout = null;
if (!immediate)
func.apply(context, args);
};
var callNow = immediate && !timeout;
clearTimeout(timeout);
timeout = setTimeout(later, wait);
if (callNow)
func.apply(context, args);
};
};
window.addEventListener('resize', _debounce(_recalc, 6));
}());
(function () {
var _lastNavigated = null;
Polymer({
is: 'page-browse',
enableCustomStyleProperties: true,
properties: {
router: Object,
pageTitle: { type: String },
q: {
type: String,
notify: true,
value: '',
observer: '_qChanged'
},
tag: {
type: String,
notify: true,
value: ''
},
package: {
type: String,
notify: true,
value: ''
},
view: {
type: String,
notify: true
},
tagList: {
type: Array,
computed: 'arrayParam(tag)',
value: function () {
return [];
}
},
packageList: {
type: Array,
computed: 'arrayParam(package)',
value: function () {
return [];
}
},
viewIcon: {
type: String,
computed: 'computeViewIcon(view)',
value: 'view-module'
},
packages: Array,
packageInfo: {
type: Object,
value: {}
},
elements: Array,
_filteredElements: Array,
_elementCount: Number,
_forceCards: { type: Boolean }
},
observers: [
'updateURL(q,package, tag, view, elements)',
'updateMeta(package, packageInfo)',
'scrollToTop(package)'
],
listeners: { 'update-params': '_handleParamsUpdate' },
ready: function () {
this.view = this._forceCards ? 'cards' : 'table';
},
filter: function (element) {
if (this.q && this.q.length && element.name.indexOf(this.q) < 0) {
return false;
}
if (this.packageList.length && this.packageList.indexOf(element.package) < 0) {
return false;
}
if (this.tagList.length) {
var match = false;
for (var i = 0; i < this.tagList.length; i++) {
if (element.tags.join(' ').indexOf(this.tagList[i]) >= 0)
match = true;
}
if (!match)
return false;
}
return true;
},
updateTag: function (e, detail) {
e.stopPropagation();
e.preventDefault();
var newTag = detail.name;
var t = this.tagList.slice(0);
if (t.indexOf(newTag) < 0)
t.push(newTag);
this.tag = t.join(',');
},
clearTag: function () {
this.tag = null;
},
updatePackage: function (e) {
e.stopPropagation();
e.preventDefault();
var newPkg = e.currentTarget.name;
var p = this.packageList.slice(0);
if (p.indexOf(newPkg) < 0)
p.push(newPkg);
this.package = p.join(',');
},
clearPackage: function () {
this.package = null;
},
togglePackages: function () {
if (this.package) {
this.prevPackage = this.package;
this.clearPackage();
} else {
this.package = this.prevPackage;
}
},
_parseQueryString: function () {
var query = window.location.search.substring(1);
var params = query.split('&');
var results = [];
for (var i = 0; i < params.length; i++) {
var pair = params[i].split('=');
results[pair[0]] = pair[1];
}
return results;
},
_buildQueryString: function () {
var out = [];
if (this.q && this.q.length)
out.push('q=' + this.q);
if (this.tag && this.tag.length)
out.push('tag=' + this.tag);
if (this.package && this.package.length)
out.push('package=' + this.package);
if (this.view !== 'table')
out.push('view=' + this.view);
return out.join('&');
},
_handleParamsUpdate: function (_, params) {
for (var key in params) {
this[key] = params[key];
}
},
_packageLink: function (name) {
return '/browse?package=' + name;
},
_qChanged: function (q) {
if (q) {
this.async(function () {
this.$.query.focus();
this.$.query.setSelectionRange(q.length, q.length);
});
}
},
updateURL: function (q, packageName, packageInfo, tag, view) {
var qs = this._buildQueryString();
if (qs !== _lastNavigated && this.router) {
_lastNavigated = qs;
this.router.go('/browse' + (qs.length ? '?' + qs : ''), { replace: true });
}
this.updateMeta(packageName, this.packageInfo);
if (this.elements) {
this._filteredElements = this.elements.filter(this.filter.bind(this));
this._elementCount = this._filteredElements.length;
}
this.scrollToTop();
},
updateMeta: function (packageName, packageInfo) {
if (this.q && this.q.length) {
var t = '\'' + this.q + '\' ';
t += packageInfo && packageInfo.title ? packageInfo.title : 'Elements';
this.pageTitle = t;
} else if (packageInfo && packageInfo.title) {
this.pageTitle = packageInfo.title;
} else if (this.tagList.length) {
this.pageTitle = 'Elements Tagged \'' + this.tagList.join('\' or \'') + '\'';
} else {
this.pageTitle = 'All Elements';
}
this.fire('page-meta', { title: this.pageTitle });
this.$.drawerPanel.closeDrawer();
},
toggleView: function () {
if (this.view === 'table') {
this.view = 'cards';
} else {
this.view = 'table';
}
},
computeViewIcon: function (view) {
if (view === 'table') {
return 'view-module';
} else {
return 'view-list';
}
},
arrayParam: function (param) {
if (!param || !param.length) {
return [];
}
return param.toString().split(',');
},
cartOpen: function (e) {
this.fire('cart-open');
},
onSearch: function (e) {
this.q = this.$.query.value;
},
scrollToTop: function () {
this.$.container.scroller.scrollTop = 0;
},
_stampCards: function (view) {
return view === 'cards';
},
_stampTable: function (view) {
return view === 'table';
},
closeDrawer: function () {
this.$.drawerPanel.closeDrawer();
},
_actualView: function (view, force) {
return force ? 'cards' : view;
},
_isEqual: function (a, b) {
return a === b;
},
_getColor: function () {
return this.packageInfo && this.packageInfo.color ? this.packageInfo.color : '';
},
_getMode: function (narrow) {
return narrow ? 'waterfall' : 'scroll';
}
});
}());
Polymer.PaperItemBehaviorImpl = {
hostAttributes: {
role: 'option',
tabindex: '0'
}
};
Polymer.PaperItemBehavior = [
Polymer.IronButtonState,
Polymer.IronControlState,
Polymer.PaperItemBehaviorImpl
];
Polymer({
is: 'paper-item',
behaviors: [Polymer.PaperItemBehavior]
});
;
(function () {
var block = {
newline: /^\n+/,
code: /^( {4}[^\n]+\n*)+/,
fences: noop,
hr: /^( *[-*_]){3,} *(?:\n+|$)/,
heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
nptable: noop,
lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
table: noop,
paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
text: /^[^\n]+/
};
block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')(/bull/g, block.bullet)();
block.list = replace(block.list)(/bull/g, block.bullet)('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')('def', '\\n+(?=' + block.def.source + ')')();
block.blockquote = replace(block.blockquote)('def', block.def)();
block._tag = '(?!(?:' + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code' + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo' + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';
block.html = replace(block.html)('comment', /\x3c!--[\s\S]*?--\x3e/)('closed', /<(tag)[\s\S]+?<\/\1>/)('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)(/tag/g, block._tag)();
block.paragraph = replace(block.paragraph)('hr', block.hr)('heading', block.heading)('lheading', block.lheading)('blockquote', block.blockquote)('tag', '<' + block._tag)('def', block.def)();
block.normal = merge({}, block);
block.gfm = merge({}, block.normal, {
fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
paragraph: /^/,
heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});
block.gfm.paragraph = replace(block.paragraph)('(?!', '(?!' + block.gfm.fences.source.replace('\\1', '\\2') + '|' + block.list.source.replace('\\1', '\\3') + '|')();
block.tables = merge({}, block.gfm, {
nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});
function Lexer(options) {
this.tokens = [];
this.tokens.links = {};
this.options = options || marked.defaults;
this.rules = block.normal;
if (this.options.gfm) {
if (this.options.tables) {
this.rules = block.tables;
} else {
this.rules = block.gfm;
}
}
}
Lexer.rules = block;
Lexer.lex = function (src, options) {
var lexer = new Lexer(options);
return lexer.lex(src);
};
Lexer.prototype.lex = function (src) {
src = src.replace(/\r\n|\r/g, '\n').replace(/\t/g, '    ').replace(/\u00a0/g, ' ').replace(/\u2424/g, '\n');
return this.token(src, true);
};
Lexer.prototype.token = function (src, top, bq) {
var src = src.replace(/^ +$/gm, ''), next, loose, cap, bull, b, item, space, i, l;
while (src) {
if (cap = this.rules.newline.exec(src)) {
src = src.substring(cap[0].length);
if (cap[0].length > 1) {
this.tokens.push({ type: 'space' });
}
}
if (cap = this.rules.code.exec(src)) {
src = src.substring(cap[0].length);
cap = cap[0].replace(/^ {4}/gm, '');
this.tokens.push({
type: 'code',
text: !this.options.pedantic ? cap.replace(/\n+$/, '') : cap
});
continue;
}
if (cap = this.rules.fences.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'code',
lang: cap[2],
text: cap[3] || ''
});
continue;
}
if (cap = this.rules.heading.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'heading',
depth: cap[1].length,
text: cap[2]
});
continue;
}
if (top && (cap = this.rules.nptable.exec(src))) {
src = src.substring(cap[0].length);
item = {
type: 'table',
header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
cells: cap[3].replace(/\n$/, '').split('\n')
};
for (i = 0; i < item.align.length; i++) {
if (/^ *-+: *$/.test(item.align[i])) {
item.align[i] = 'right';
} else if (/^ *:-+: *$/.test(item.align[i])) {
item.align[i] = 'center';
} else if (/^ *:-+ *$/.test(item.align[i])) {
item.align[i] = 'left';
} else {
item.align[i] = null;
}
}
for (i = 0; i < item.cells.length; i++) {
item.cells[i] = item.cells[i].split(/ *\| */);
}
this.tokens.push(item);
continue;
}
if (cap = this.rules.lheading.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'heading',
depth: cap[2] === '=' ? 1 : 2,
text: cap[1]
});
continue;
}
if (cap = this.rules.hr.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({ type: 'hr' });
continue;
}
if (cap = this.rules.blockquote.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({ type: 'blockquote_start' });
cap = cap[0].replace(/^ *> ?/gm, '');
this.token(cap, top, true);
this.tokens.push({ type: 'blockquote_end' });
continue;
}
if (cap = this.rules.list.exec(src)) {
src = src.substring(cap[0].length);
bull = cap[2];
this.tokens.push({
type: 'list_start',
ordered: bull.length > 1
});
cap = cap[0].match(this.rules.item);
next = false;
l = cap.length;
i = 0;
for (; i < l; i++) {
item = cap[i];
space = item.length;
item = item.replace(/^ *([*+-]|\d+\.) +/, '');
if (~item.indexOf('\n ')) {
space -= item.length;
item = !this.options.pedantic ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '') : item.replace(/^ {1,4}/gm, '');
}
if (this.options.smartLists && i !== l - 1) {
b = block.bullet.exec(cap[i + 1])[0];
if (bull !== b && !(bull.length > 1 && b.length > 1)) {
src = cap.slice(i + 1).join('\n') + src;
i = l - 1;
}
}
loose = next || /\n\n(?!\s*$)/.test(item);
if (i !== l - 1) {
next = item.charAt(item.length - 1) === '\n';
if (!loose)
loose = next;
}
this.tokens.push({ type: loose ? 'loose_item_start' : 'list_item_start' });
this.token(item, false, bq);
this.tokens.push({ type: 'list_item_end' });
}
this.tokens.push({ type: 'list_end' });
continue;
}
if (cap = this.rules.html.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: this.options.sanitize ? 'paragraph' : 'html',
pre: !this.options.sanitizer && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
text: cap[0]
});
continue;
}
if (!bq && top && (cap = this.rules.def.exec(src))) {
src = src.substring(cap[0].length);
this.tokens.links[cap[1].toLowerCase()] = {
href: cap[2],
title: cap[3]
};
continue;
}
if (top && (cap = this.rules.table.exec(src))) {
src = src.substring(cap[0].length);
item = {
type: 'table',
header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
};
for (i = 0; i < item.align.length; i++) {
if (/^ *-+: *$/.test(item.align[i])) {
item.align[i] = 'right';
} else if (/^ *:-+: *$/.test(item.align[i])) {
item.align[i] = 'center';
} else if (/^ *:-+ *$/.test(item.align[i])) {
item.align[i] = 'left';
} else {
item.align[i] = null;
}
}
for (i = 0; i < item.cells.length; i++) {
item.cells[i] = item.cells[i].replace(/^ *\| *| *\| *$/g, '').split(/ *\| */);
}
this.tokens.push(item);
continue;
}
if (top && (cap = this.rules.paragraph.exec(src))) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'paragraph',
text: cap[1].charAt(cap[1].length - 1) === '\n' ? cap[1].slice(0, -1) : cap[1]
});
continue;
}
if (cap = this.rules.text.exec(src)) {
src = src.substring(cap[0].length);
this.tokens.push({
type: 'text',
text: cap[0]
});
continue;
}
if (src) {
throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
}
}
return this.tokens;
};
var inline = {
escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
url: noop,
tag: /^\x3c!--[\s\S]*?--\x3e|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
link: /^!?\[(inside)\]\(href\)/,
reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
br: /^ {2,}\n(?!\s*$)/,
del: noop,
text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};
inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;
inline.link = replace(inline.link)('inside', inline._inside)('href', inline._href)();
inline.reflink = replace(inline.reflink)('inside', inline._inside)();
inline.normal = merge({}, inline);
inline.pedantic = merge({}, inline.normal, {
strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});
inline.gfm = merge({}, inline.normal, {
escape: replace(inline.escape)('])', '~|])')(),
url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
del: /^~~(?=\S)([\s\S]*?\S)~~/,
text: replace(inline.text)(']|', '~]|')('|', '|https?://|')()
});
inline.breaks = merge({}, inline.gfm, {
br: replace(inline.br)('{2,}', '*')(),
text: replace(inline.gfm.text)('{2,}', '*')()
});
function InlineLexer(links, options) {
this.options = options || marked.defaults;
this.links = links;
this.rules = inline.normal;
this.renderer = this.options.renderer || new Renderer();
this.renderer.options = this.options;
if (!this.links) {
throw new Error('Tokens array requires a `links` property.');
}
if (this.options.gfm) {
if (this.options.breaks) {
this.rules = inline.breaks;
} else {
this.rules = inline.gfm;
}
} else if (this.options.pedantic) {
this.rules = inline.pedantic;
}
}
InlineLexer.rules = inline;
InlineLexer.output = function (src, links, options) {
var inline = new InlineLexer(links, options);
return inline.output(src);
};
InlineLexer.prototype.output = function (src) {
var out = '', link, text, href, cap;
while (src) {
if (cap = this.rules.escape.exec(src)) {
src = src.substring(cap[0].length);
out += cap[1];
continue;
}
if (cap = this.rules.autolink.exec(src)) {
src = src.substring(cap[0].length);
if (cap[2] === '@') {
text = cap[1].charAt(6) === ':' ? this.mangle(cap[1].substring(7)) : this.mangle(cap[1]);
href = this.mangle('mailto:') + text;
} else {
text = escape(cap[1]);
href = text;
}
out += this.renderer.link(href, null, text);
continue;
}
if (!this.inLink && (cap = this.rules.url.exec(src))) {
src = src.substring(cap[0].length);
text = escape(cap[1]);
href = text;
out += this.renderer.link(href, null, text);
continue;
}
if (cap = this.rules.tag.exec(src)) {
if (!this.inLink && /^<a /i.test(cap[0])) {
this.inLink = true;
} else if (this.inLink && /^<\/a>/i.test(cap[0])) {
this.inLink = false;
}
src = src.substring(cap[0].length);
out += this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0];
continue;
}
if (cap = this.rules.link.exec(src)) {
src = src.substring(cap[0].length);
this.inLink = true;
out += this.outputLink(cap, {
href: cap[2],
title: cap[3]
});
this.inLink = false;
continue;
}
if ((cap = this.rules.reflink.exec(src)) || (cap = this.rules.nolink.exec(src))) {
src = src.substring(cap[0].length);
link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
link = this.links[link.toLowerCase()];
if (!link || !link.href) {
out += cap[0].charAt(0);
src = cap[0].substring(1) + src;
continue;
}
this.inLink = true;
out += this.outputLink(cap, link);
this.inLink = false;
continue;
}
if (cap = this.rules.strong.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.strong(this.output(cap[2] || cap[1]));
continue;
}
if (cap = this.rules.em.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.em(this.output(cap[2] || cap[1]));
continue;
}
if (cap = this.rules.code.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.codespan(escape(cap[2], true));
continue;
}
if (cap = this.rules.br.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.br();
continue;
}
if (cap = this.rules.del.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.del(this.output(cap[1]));
continue;
}
if (cap = this.rules.text.exec(src)) {
src = src.substring(cap[0].length);
out += this.renderer.text(escape(this.smartypants(cap[0])));
continue;
}
if (src) {
throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
}
}
return out;
};
InlineLexer.prototype.outputLink = function (cap, link) {
var href = escape(link.href), title = link.title ? escape(link.title) : null;
return cap[0].charAt(0) !== '!' ? this.renderer.link(href, title, this.output(cap[1])) : this.renderer.image(href, title, escape(cap[1]));
};
InlineLexer.prototype.smartypants = function (text) {
if (!this.options.smartypants)
return text;
return text.replace(/---/g, '\u2014').replace(/--/g, '\u2013').replace(/(^|[-\u2014\/(\[{"\s])'/g, '$1\u2018').replace(/'/g, '\u2019').replace(/(^|[-\u2014\/(\[{\u2018\s])"/g, '$1\u201C').replace(/"/g, '\u201D').replace(/\.{3}/g, '\u2026');
};
InlineLexer.prototype.mangle = function (text) {
if (!this.options.mangle)
return text;
var out = '', l = text.length, i = 0, ch;
for (; i < l; i++) {
ch = text.charCodeAt(i);
if (Math.random() > 0.5) {
ch = 'x' + ch.toString(16);
}
out += '&#' + ch + ';';
}
return out;
};
function Renderer(options) {
this.options = options || {};
}
Renderer.prototype.code = function (code, lang, escaped) {
if (this.options.highlight) {
var out = this.options.highlight(code, lang);
if (out != null && out !== code) {
escaped = true;
code = out;
}
}
if (!lang) {
return '<pre><code>' + (escaped ? code : escape(code, true)) + '\n</code></pre>';
}
return '<pre><code class="' + this.options.langPrefix + escape(lang, true) + '">' + (escaped ? code : escape(code, true)) + '\n</code></pre>\n';
};
Renderer.prototype.blockquote = function (quote) {
return '<blockquote>\n' + quote + '</blockquote>\n';
};
Renderer.prototype.html = function (html) {
return html;
};
Renderer.prototype.heading = function (text, level, raw) {
return '<h' + level + ' id="' + this.options.headerPrefix + raw.toLowerCase().replace(/[^\w]+/g, '-') + '">' + text + '</h' + level + '>\n';
};
Renderer.prototype.hr = function () {
return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};
Renderer.prototype.list = function (body, ordered) {
var type = ordered ? 'ol' : 'ul';
return '<' + type + '>\n' + body + '</' + type + '>\n';
};
Renderer.prototype.listitem = function (text) {
return '<li>' + text + '</li>\n';
};
Renderer.prototype.paragraph = function (text) {
return '<p>' + text + '</p>\n';
};
Renderer.prototype.table = function (header, body) {
return '<table>\n' + '<thead>\n' + header + '</thead>\n' + '<tbody>\n' + body + '</tbody>\n' + '</table>\n';
};
Renderer.prototype.tablerow = function (content) {
return '<tr>\n' + content + '</tr>\n';
};
Renderer.prototype.tablecell = function (content, flags) {
var type = flags.header ? 'th' : 'td';
var tag = flags.align ? '<' + type + ' style="text-align:' + flags.align + '">' : '<' + type + '>';
return tag + content + '</' + type + '>\n';
};
Renderer.prototype.strong = function (text) {
return '<strong>' + text + '</strong>';
};
Renderer.prototype.em = function (text) {
return '<em>' + text + '</em>';
};
Renderer.prototype.codespan = function (text) {
return '<code>' + text + '</code>';
};
Renderer.prototype.br = function () {
return this.options.xhtml ? '<br/>' : '<br>';
};
Renderer.prototype.del = function (text) {
return '<del>' + text + '</del>';
};
Renderer.prototype.link = function (href, title, text) {
if (this.options.sanitize) {
try {
var prot = decodeURIComponent(unescape(href)).replace(/[^\w:]/g, '').toLowerCase();
} catch (e) {
return '';
}
if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
return '';
}
}
var out = '<a href="' + href + '"';
if (title) {
out += ' title="' + title + '"';
}
out += '>' + text + '</a>';
return out;
};
Renderer.prototype.image = function (href, title, text) {
var out = '<img src="' + href + '" alt="' + text + '"';
if (title) {
out += ' title="' + title + '"';
}
out += this.options.xhtml ? '/>' : '>';
return out;
};
Renderer.prototype.text = function (text) {
return text;
};
function Parser(options) {
this.tokens = [];
this.token = null;
this.options = options || marked.defaults;
this.options.renderer = this.options.renderer || new Renderer();
this.renderer = this.options.renderer;
this.renderer.options = this.options;
}
Parser.parse = function (src, options, renderer) {
var parser = new Parser(options, renderer);
return parser.parse(src);
};
Parser.prototype.parse = function (src) {
this.inline = new InlineLexer(src.links, this.options, this.renderer);
this.tokens = src.reverse();
var out = '';
while (this.next()) {
out += this.tok();
}
return out;
};
Parser.prototype.next = function () {
return this.token = this.tokens.pop();
};
Parser.prototype.peek = function () {
return this.tokens[this.tokens.length - 1] || 0;
};
Parser.prototype.parseText = function () {
var body = this.token.text;
while (this.peek().type === 'text') {
body += '\n' + this.next().text;
}
return this.inline.output(body);
};
Parser.prototype.tok = function () {
switch (this.token.type) {
case 'space': {
return '';
}
case 'hr': {
return this.renderer.hr();
}
case 'heading': {
return this.renderer.heading(this.inline.output(this.token.text), this.token.depth, this.token.text);
}
case 'code': {
return this.renderer.code(this.token.text, this.token.lang, this.token.escaped);
}
case 'table': {
var header = '', body = '', i, row, cell, flags, j;
cell = '';
for (i = 0; i < this.token.header.length; i++) {
flags = {
header: true,
align: this.token.align[i]
};
cell += this.renderer.tablecell(this.inline.output(this.token.header[i]), {
header: true,
align: this.token.align[i]
});
}
header += this.renderer.tablerow(cell);
for (i = 0; i < this.token.cells.length; i++) {
row = this.token.cells[i];
cell = '';
for (j = 0; j < row.length; j++) {
cell += this.renderer.tablecell(this.inline.output(row[j]), {
header: false,
align: this.token.align[j]
});
}
body += this.renderer.tablerow(cell);
}
return this.renderer.table(header, body);
}
case 'blockquote_start': {
var body = '';
while (this.next().type !== 'blockquote_end') {
body += this.tok();
}
return this.renderer.blockquote(body);
}
case 'list_start': {
var body = '', ordered = this.token.ordered;
while (this.next().type !== 'list_end') {
body += this.tok();
}
return this.renderer.list(body, ordered);
}
case 'list_item_start': {
var body = '';
while (this.next().type !== 'list_item_end') {
body += this.token.type === 'text' ? this.parseText() : this.tok();
}
return this.renderer.listitem(body);
}
case 'loose_item_start': {
var body = '';
while (this.next().type !== 'list_item_end') {
body += this.tok();
}
return this.renderer.listitem(body);
}
case 'html': {
var html = !this.token.pre && !this.options.pedantic ? this.inline.output(this.token.text) : this.token.text;
return this.renderer.html(html);
}
case 'paragraph': {
return this.renderer.paragraph(this.inline.output(this.token.text));
}
case 'text': {
return this.renderer.paragraph(this.parseText());
}
}
};
function escape(html, encode) {
return html.replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function unescape(html) {
return html.replace(/&([#\w]+);/g, function (_, n) {
n = n.toLowerCase();
if (n === 'colon')
return ':';
if (n.charAt(0) === '#') {
return n.charAt(1) === 'x' ? String.fromCharCode(parseInt(n.substring(2), 16)) : String.fromCharCode(+n.substring(1));
}
return '';
});
}
function replace(regex, opt) {
regex = regex.source;
opt = opt || '';
return function self(name, val) {
if (!name)
return new RegExp(regex, opt);
val = val.source || val;
val = val.replace(/(^|[^\[])\^/g, '$1');
regex = regex.replace(name, val);
return self;
};
}
function noop() {
}
noop.exec = noop;
function merge(obj) {
var i = 1, target, key;
for (; i < arguments.length; i++) {
target = arguments[i];
for (key in target) {
if (Object.prototype.hasOwnProperty.call(target, key)) {
obj[key] = target[key];
}
}
}
return obj;
}
function marked(src, opt, callback) {
if (callback || typeof opt === 'function') {
if (!callback) {
callback = opt;
opt = null;
}
opt = merge({}, marked.defaults, opt || {});
var highlight = opt.highlight, tokens, pending, i = 0;
try {
tokens = Lexer.lex(src, opt);
} catch (e) {
return callback(e);
}
pending = tokens.length;
var done = function (err) {
if (err) {
opt.highlight = highlight;
return callback(err);
}
var out;
try {
out = Parser.parse(tokens, opt);
} catch (e) {
err = e;
}
opt.highlight = highlight;
return err ? callback(err) : callback(null, out);
};
if (!highlight || highlight.length < 3) {
return done();
}
delete opt.highlight;
if (!pending)
return done();
for (; i < tokens.length; i++) {
(function (token) {
if (token.type !== 'code') {
return --pending || done();
}
return highlight(token.text, token.lang, function (err, code) {
if (err)
return done(err);
if (code == null || code === token.text) {
return --pending || done();
}
token.text = code;
token.escaped = true;
--pending || done();
});
}(tokens[i]));
}
return;
}
try {
if (opt)
opt = merge({}, marked.defaults, opt);
return Parser.parse(Lexer.lex(src, opt), opt);
} catch (e) {
e.message += '\nPlease report this to https://github.com/chjj/marked.';
if ((opt || marked.defaults).silent) {
return '<p>An error occured:</p><pre>' + escape(e.message + '', true) + '</pre>';
}
throw e;
}
}
marked.options = marked.setOptions = function (opt) {
merge(marked.defaults, opt);
return marked;
};
marked.defaults = {
gfm: true,
tables: true,
breaks: false,
pedantic: false,
sanitize: false,
sanitizer: null,
mangle: true,
smartLists: false,
silent: false,
highlight: null,
langPrefix: 'lang-',
smartypants: false,
headerPrefix: '',
renderer: new Renderer(),
xhtml: false
};
marked.Parser = Parser;
marked.parser = Parser.parse;
marked.Renderer = Renderer;
marked.Lexer = Lexer;
marked.lexer = Lexer.lex;
marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;
marked.parse = marked;
if (typeof module !== 'undefined' && typeof exports === 'object') {
module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
define(function () {
return marked;
});
} else {
this.marked = marked;
}
}.call(function () {
return this || (typeof window !== 'undefined' ? window : global);
}()));
'use strict';
Polymer({
is: 'marked-element',
properties: {
markdown: {
observer: 'render',
type: String,
value: null
},
pedantic: {
observer: 'render',
type: Boolean,
value: false
},
sanitize: {
observer: 'render',
type: Boolean,
value: false
},
smartypants: {
observer: 'render',
type: Boolean,
value: false
}
},
ready: function () {
if (!this.markdown) {
var markdownElement = Polymer.dom(this).querySelector('[type^="text/markdown"]');
if (markdownElement != null) {
this.markdown = this._unindent(markdownElement.textContent);
}
}
},
attached: function () {
this._attached = true;
this._outputElement = this.outputElement;
this.render();
},
detached: function () {
this._attached = false;
},
unindent: function (text) {
return this._unindent(text);
},
get outputElement() {
var child = Polymer.dom(this).queryDistributedElements('.markdown-html')[0];
if (child)
return child;
this.toggleClass('hidden', false, this.$.content);
return this.$.content;
},
render: function () {
if (!this._attached)
return;
if (!this.markdown) {
Polymer.dom(this._outputElement).innerHTML = '';
return;
}
var opts = {
highlight: this._highlight.bind(this),
sanitize: this.sanitize,
pedantic: this.pedantic,
smartypants: this.smartypants
};
Polymer.dom(this._outputElement).innerHTML = marked(this.markdown, opts);
this.fire('marked-render-complete');
},
_highlight: function (code, lang) {
var event = this.fire('syntax-highlight', {
code: code,
lang: lang
});
return event.detail.code || code;
},
_unindent: function (text) {
if (!text)
return text;
var lines = text.replace(/\t/g, '  ').split('\n');
var indent = lines.reduce(function (prev, line) {
if (/^\s*$/.test(line))
return prev;
var lineIndent = line.match(/^(\s*)/)[0].length;
if (prev === null)
return lineIndent;
return lineIndent < prev ? lineIndent : prev;
}, null);
return lines.map(function (l) {
return l.substr(indent);
}).join('\n');
}
});
(function () {
Polymer({
is: 'iron-doc-property',
properties: {
descriptor: {
type: Object,
observer: '_descriptorChanged'
},
collapsed: {
type: Boolean,
value: false,
observer: '_collapsedChanged'
},
anchorId: {
type: String,
reflectToAttribute: true
},
_paramText: String
},
listeners: {
'transitionEnd': '_onTransitionEnd',
'webkitTransitionEnd': '_onTransitionEnd'
},
ready: function () {
this._isReady = true;
},
_onTransitionEnd: function (event) {
if (event.path[0] !== this.$.transitionMask)
return;
this.$.transitionMask.style.height = '';
},
_descriptorChanged: function () {
this.toggleAttribute('private', this.descriptor.private);
this.toggleAttribute('configuration', this.descriptor.configuration);
this.toggleAttribute('function', this.descriptor.function);
this._paramText = (this.descriptor.params || []).map(function (param) {
return param.name;
}).join(', ');
},
_collapsedChanged: function () {
if (!this._isReady) {
this.toggleAttribute('_collapsed', this.collapsed);
return;
}
var container = this.$.transitionMask;
var collapsed = this.collapsed;
container.style.height = 'auto';
var fullHeight = container.offsetHeight;
if (this.collapsed) {
container.style.height = fullHeight + 'px';
} else {
container.style.height = '';
}
requestAnimationFrame(function () {
this.toggleAttribute('_collapsed', collapsed);
if (this.collapsed) {
container.style.height = '';
} else {
container.style.height = fullHeight + 'px';
}
}.bind(this));
},
_computeHideMeta: function (descriptor) {
return descriptor.type === undefined && descriptor.default === undefined;
},
_computeHideParams: function (descriptor, ret) {
return (!descriptor.params || descriptor.params.length === 0) && !ret;
},
_computeHideDefault: function (def) {
return def === undefined;
},
_computeDefaultDisplay: function (def) {
if (def === '')
return '\'\'';
return def;
},
_getAnnotation: function (descriptor) {
var annotations = [];
if (descriptor['default'] !== undefined) {
annotations.push('Default: ' + descriptor['default']);
}
if (descriptor.readOnly) {
annotations.push('readOnly');
}
if (descriptor.notify) {
annotations.push('notifies');
}
return annotations.join(' \u2013 ');
}
});
}());
(function () {
Polymer({
is: 'iron-doc-viewer',
properties: {
descriptor: {
type: Object,
observer: '_descriptorChanged'
},
prefix: {
type: String,
value: ''
},
_showPrivate: {
type: Boolean,
value: false,
observer: '_showPrivateChanged'
},
_privateToggleLabel: String
},
ready: function () {
var jsonDescriptor = this._loadJson();
if (jsonDescriptor && this.descriptor) {
console.error(this, 'received both a bound descriptor:', this.descriptor, 'and JSON descriptor:', this._jsonDescriptor, 'Please provide only one');
throw new Error('<iron-doc-viewer> accepts either a bound or JSON descriptor; not both');
}
if (jsonDescriptor) {
this.descriptor = jsonDescriptor;
}
},
_loadJson: function () {
var textContent = '';
Array.prototype.forEach.call(Polymer.dom(this).childNodes, function (node) {
textContent = textContent + node.textContent;
});
textContent = textContent.trim();
if (textContent === '')
return null;
try {
return JSON.parse(textContent);
} catch (error) {
console.error('Failure when parsing JSON:', textContent, error);
throw error;
}
},
_descriptorChanged: function () {
if (!this.descriptor)
return;
var properties = [];
var methods = [];
for (var i = 0, property; property = this.descriptor.properties[i]; i++) {
(property.type === 'Function' ? methods : properties).push(property);
}
this._properties = properties;
this._methods = methods;
this._events = this.descriptor.events || [];
this._behaviors = this.descriptor.behaviors || [];
this.toggleAttribute('abstract', this.descriptor.abstract);
},
scrollToAnchor: function (hash) {
if (hash && hash.length > 1) {
Polymer.dom.flush();
var anchorId = window.location.hash.slice(1);
var elementToFocus = this.$$('[anchor-id="' + anchorId + '"]');
if (elementToFocus) {
elementToFocus.scrollIntoView();
}
}
},
_collapsedChanged: function () {
this._collapseToggleLabel = this._collapsed ? 'expand' : 'collapse';
var properties = this.querySelectorAll('iron-doc-property');
for (var i = 0, property; property = properties[i]; i++) {
property.collapsed = this._collapsed;
}
},
_toggleCollapsed: function () {
this._collapsed = !this._collapsed;
},
_showPrivateChanged: function () {
this._privateToggleLabel = (this._showPrivate ? 'hide' : 'show') + ' private API';
this.toggleClass('show-private', this._showPrivate);
},
_togglePrivate: function () {
this._showPrivate = !this._showPrivate;
},
_noneToShow: function (showPrivate, items) {
for (var i = 0; i < items.length; i++) {
if (showPrivate || !items[i].private)
return false;
}
return true;
},
_formatAnchor: function (prefix, type, membername) {
var suffix = membername ? '-' + membername : '';
return prefix + type + suffix;
},
_hideBehaviors: function (behaviors) {
return behaviors === null || behaviors.length === 0;
},
_broadcastBehavior: function (ev) {
this.fire('iron-doc-viewer-component-selected', ev.target._templateInstance.item);
}
});
}());
(function () {
function _baseUrl(url) {
return url.match(/^(.*?)\/?([^\/]+\.[^\/]+)?$/)[1] + '/';
}
Polymer({
is: 'iron-component-page',
properties: {
src: {
type: String,
observer: '_srcChanged'
},
docSrc: {
type: String,
observer: '_srcChanged'
},
base: {
type: String,
value: function () {
return this.ownerDocument.baseURI.replace(/\#.*$/, '');
}
},
active: {
type: String,
notify: true,
value: ''
},
view: {
type: String,
value: 'docs',
notify: true
},
transitive: {
type: Boolean,
value: false
},
docElements: {
type: Array,
notify: true,
readOnly: true,
value: function () {
return [];
}
},
docBehaviors: {
type: Array,
notify: true,
readOnly: true,
value: function () {
return [];
}
},
docDemos: {
type: Array,
notify: true,
readOnly: true
},
scrollMode: {
type: String,
value: 'waterfall'
},
_activeDescriptor: Object,
_fragmentPrefix: String,
catalog: {
type: Boolean,
value: false,
reflectToAttribute: true
},
version: String,
_analyzer: {
type: Object,
observer: '_analyzerChanged'
},
_hydroDesc: {
type: Object,
observer: '_detectAnalyzer'
},
_ajaxDesc: {
type: Object,
observer: '_detectAnalyzer'
},
_loading: {
type: Boolean,
observer: '_loadingChanged'
},
_hydroLoading: {
type: Boolean,
observer: '_detectLoading'
},
_ajaxLoading: {
type: Boolean,
observer: '_detectLoading'
},
_demoUrl: {
type: String,
value: ''
},
_srcUrl: String
},
observers: [
'_updateFrameSrc(view, base)',
'_activeChanged(active, _analyzer)'
],
attached: function () {
if (!this.catalog) {
this._setActiveFromHash();
this.listen(window, 'hashchange', '_setActiveFromHash');
}
},
detached: function () {
if (!this.catalog) {
this.unlisten(window, 'hashchange', '_setActiveFromHash');
}
},
ready: function () {
var elements = this._loadJson();
if (elements) {
this.docElements = elements;
this._loading = false;
} else {
if (!this.src && !this.catalog) {
this._srcChanged();
}
}
},
_loadJson: function () {
var textContent = '';
Array.prototype.forEach.call(Polymer.dom(this).childNodes, function (node) {
textContent = textContent + node.textContent;
});
textContent = textContent.trim();
if (textContent === '')
return null;
try {
var json = JSON.parse(textContent);
if (!Array.isArray(json))
return [];
return json;
} catch (error) {
console.error('Failure when parsing JSON:', textContent, error);
throw error;
}
},
_setActiveFromHash: function (hash) {
var hash = window.location.hash;
if (hash) {
var elementDelimiter = hash.indexOf(':');
elementDelimiter = elementDelimiter == -1 ? hash.length : elementDelimiter;
var el = hash.slice(1, elementDelimiter);
if (this.active != el) {
this.active = el;
}
this.$.viewer.scrollToAnchor(hash);
}
},
_srcChanged: function () {
var srcUrl;
if (this.docSrc) {
if (!this.$.ajax.lastRequest || this.docSrc !== this.$.ajax.lastRequest.url && this.docSrc !== this._lastDocSrc) {
this._ajaxLoading = true;
this._ajaxDesc = null;
this._activeDescriptor = null;
this.$.ajax.generateRequest();
}
this._lastDocSrc = this.docSrc;
return;
} else if (this.src) {
srcUrl = new URL(this.src, this.base).toString();
} else {
var base = _baseUrl(this.base);
srcUrl = new URL(base.match(/([^\/]*)\/$/)[1] + '.html', base).toString();
}
var match = srcUrl.match(/([^\/\.]+)\.github\.io\/([^\/]+)\/?([^\/]*)$/);
if (match) {
srcUrl = 'https://cdn.rawgit.com/' + match[1] + '/' + match[2] + '/master/' + match[3];
}
this._baseUrl = _baseUrl(srcUrl);
this._srcUrl = srcUrl;
if (!this._hydroLoading)
this.$.analyzer.analyze();
},
_updateFrameSrc: function (view) {
if (!view || view.indexOf('demo:') !== 0)
return 'about:blank';
var src = view.split(':')[1];
var demoSrc = new URL(src, this.base).toString();
if (this._iframe) {
Polymer.dom(this.$.demo).removeChild(this._iframe);
}
this._iframe = document.createElement('iframe');
this._iframe.src = demoSrc;
Polymer.dom(this.$.demo).appendChild(this._iframe);
},
_getDefaultActive: function () {
var matchedPage;
var url = this._srcUrl || this.base;
var mainFile = url.replace(_baseUrl(this.base), '');
function findMatch(list) {
for (var item, i = 0; i < list.length; i++) {
item = list[i];
if (item && item.contentHref && item.contentHref.indexOf(mainFile) > 0) {
return item;
}
}
return null;
}
matchedPage = findMatch(this.docElements) || findMatch(this.docBehaviors);
if (matchedPage) {
return matchedPage.is;
} else if (this.docElements.length > 0) {
return this.docElements[0].is;
} else if (this.docBehaviors.length > 0) {
return this.docBehaviors[0].is;
}
return null;
},
_findDescriptor: function (name) {
if (!this._analyzer)
return null;
var descriptor = this._analyzer.elementsByTagName[name];
if (descriptor)
return descriptor;
for (var i = 0; i < this._analyzer.behaviors.length; i++) {
if (this._analyzer.behaviors[i].is === name) {
return this._analyzer.behaviors[i];
}
}
return null;
},
_activeChanged: function (active, analyzer) {
if (active === '') {
this.active = this._getDefaultActive();
return;
}
this.async(function () {
this.$.active.value = active;
});
if (analyzer && analyzer.elementsByTagName) {
this.$.headerPanel.scroller.scrollTop = 0;
this._activeDescriptor = this._findDescriptor(active);
if (this._activeDescriptor) {
var hasDemo;
var demos = this._activeDescriptor.demos;
if (this.view && demos && demos.length) {
var parts = this.view.split(':');
if (parts[0] == 'demo') {
if (parts[1]) {
hasDemo = demos.some(function (d, i) {
if (d.path == parts[1]) {
return true;
}
});
}
if (!hasDemo) {
this.view = 'demo:' + demos[0].path;
hasDemo = true;
}
}
}
if (!hasDemo == undefined) {
this.view = 'docs';
}
if (this._activeDescriptor.is && !document.title) {
document.title = this._activeDescriptor.is + ' documentation';
}
if (this._activeDescriptor.is && !this.catalog) {
this._fragmentPrefix = this._activeDescriptor.is + ':';
} else {
this._fragmentPrefix = '';
}
this.$.viewer.scrollToAnchor(window.location.hash);
}
this._setDocDemos(this._activeDescriptor ? this._activeDescriptor.demos : []);
}
},
_loadingChanged: function () {
this.toggleClass('loaded', !this._loading);
},
_detectLoading: function () {
this._loading = this.docSrc ? this._ajaxLoading : this._hydroLoading;
},
_analyzerChanged: function () {
var analyzer = this._analyzer;
this._setDocElements(analyzer && analyzer.elements ? analyzer.elements : []);
this._setDocBehaviors(analyzer && analyzer.behaviors ? analyzer.behaviors : []);
if (!this._findDescriptor(this.active)) {
this.active = this._getDefaultActive();
}
},
_detectAnalyzer: function () {
this._analyzer = this.docSrc ? this._ajaxDesc : this._hydroDesc;
},
_handleMenuItemSelected: function (e) {
if (e.target && e.target.value) {
window.location.hash = '#' + e.target.value;
}
},
_handleAjaxResponse: function (e, req) {
this._ajaxLoading = false;
this._ajaxLastUrl = req.url;
this._ajaxDesc = req.response;
},
_handleError: function (e) {
this.fire('iron-component-page-error', e.detail);
},
_handleComponentSelectedEvent: function (ev) {
var descriptor = this._findDescriptor(ev.detail);
if (!descriptor) {
console.warn('Could not navigate to ', ev.detail);
} else {
this.active = ev.detail;
}
},
marshal: function () {
var jsonText = JSON.stringify(this.docElements || [], null, '  ');
return '<' + this.is + '>\n' + jsonText.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n' + '</' + this.is + '>';
},
_demoView: function (path) {
return 'demo:' + path;
},
_viewType: function (view) {
return view ? view.split(':')[0] : null;
}
});
}());
(function () {
Polymer({
is: 'paper-menu',
behaviors: [Polymer.IronMenuBehavior]
});
}());
Polymer({
is: 'cart-item-icon',
properties: {
element: {
type: String,
observer: '_update'
},
presentLabel: {
type: String,
value: 'Remove from Collection',
observer: '_update'
},
absentLabel: {
type: String,
value: 'Add to Collection',
observer: '_update'
},
present: {
type: Boolean,
notify: true,
readOnly: true,
value: false
},
noLabel: {
type: Boolean,
value: false
},
tappable: {
type: Boolean,
value: false
},
_label: String,
_icon: String
},
listeners: { tap: '_tapped' },
attached: function () {
this._update();
},
_update: function () {
this._setPresent(this.$.cart.includes(this.element));
this._label = this.present ? this.presentLabel : this.absentLabel;
this.setAttribute('aria-label', this._label);
this.debounce('icon', function () {
this._icon = this.present ? 'star' : 'star-border';
}, 10);
},
toggle: function (e) {
this.fire(this.present ? 'cart-remove' : 'cart-add', this.element);
},
_tapped: function () {
if (this.tappable)
this.toggle();
}
});
Polymer({
is: 'page-element',
enableCustomStyleProperties: true,
properties: {
element: String,
view: {
type: String,
value: 'docs'
},
active: {
type: String,
value: ''
},
docElements: Array,
docBehaviors: Array,
docDemos: Array,
docs: Object,
metadata: {
type: Object,
value: null
},
package: Object,
router: Object,
q: String,
packageName: {
type: String,
reflectToAttribute: true
},
narrowDrawer: Boolean
},
observers: [
'updateMeta(element,active)',
'viewUpdated(view)',
'analyze(importPath)',
'search(q)',
'_updateStyles(package)'
],
attached: function () {
this.updateMeta();
},
analyze: function () {
this.$.analyzer.analyze();
},
_link: function (active, view) {
return this.getURL(active, view);
},
_demoLink: function (active, path) {
return this.getURL(active, 'demo:' + path, true);
},
_demoActive: function (path) {
return this.view === 'demo:' + path;
},
_githubLink: function (source) {
return 'https://github.com/' + source;
},
getURL: function (active, view, force) {
var url = '/elements/' + this.element;
var qs = [];
if (force || view && view.length && view !== 'docs')
qs.push('view=' + view);
if (force || active && active.length && active !== this.element)
qs.push('active=' + active);
if (qs.length)
url += '?' + qs.join('&');
return url;
},
updateMeta: function (element, active) {
this.$.drawerPanel.closeDrawer();
this.fire('page-meta', { title: this.active && this.active.length ? this.active : this.element });
},
viewUpdated: function () {
this.$.drawerPanel.closeDrawer();
},
_packageLink: function () {
return '/browse?package=' + this.package.name;
},
navToElement: function (e) {
this.router.go('/elements/' + e.currentTarget.getAttribute('name'));
},
navToBehavior: function (e, detail) {
if (this.behaviorMap[detail]) {
this.router.go('/elements/' + this.behaviorMap[detail] + '?active=' + detail);
} else {
this.fire('toast', { text: 'No documentation available for ' + detail });
}
},
docSrc: function (element) {
return '/data/docs/' + element + '.json';
},
baseURI: function (element) {
return window.location.origin + '/bower_components/' + element + '/' + element + '.html';
},
search: function (q) {
if (q || this.q) {
this.router.go('/browse?q=' + (q || this.q));
}
},
cartAdd: function () {
this.fire('cart-add', this.element);
},
_oneOrFewer: function (arr1, arr2) {
if (!arr1 || arr1.length === 0) {
return true;
}
if (!arr2) {
return arr1.length <= 1;
}
return arr1.length + arr2.length <= 1;
},
toggleCart: function () {
this.$.cartIcon.toggle();
},
listFilter: function (el) {
return el.package === this.package.name;
},
_demoName: function (name) {
return name === 'demo' ? 'Demo' : name;
},
_isEqual: function (a, b) {
return a === b;
},
_bowerCommand: function (source) {
return 'bower install --save ' + source;
},
_selectAllBowerCommand: function (e) {
e.currentTarget.select();
},
_isCartIconHidden: function (view) {
return view.indexOf('demo:') === 0;
},
_handleError: function () {
this.router.go('/404');
},
_updateStyles: function (packageInfo) {
this.packageName = packageInfo.name;
this.async(this.$.componentPage.updateStyles, 2);
},
_getScrollMode: function (narrowDrawer) {
return narrowDrawer ? 'waterfall' : 'scroll';
}
});
Polymer({
is: 'page-guide',
properties: {
router: Object,
guides: Array,
guide: Object,
name: {
type: String,
observer: '_nameChanged'
},
content: String
},
enableCustomStyleProperties: true,
observers: [
'contentChanged(content)',
'updateMeta(guide)'
],
contentChanged: function () {
if (this.content.indexOf('<!doctype') >= 0) {
this._catalogGuideError();
} else {
this.$.content.innerHTML = this.content;
this._decorateHeadings();
this._highlight();
this.scopeSubtree(this.$.content);
if (window.location.hash !== '') {
var el = Polymer.dom(this.$.content).querySelector(window.location.hash);
if (el)
el.scrollIntoView();
}
}
},
_nameChanged: function () {
this.$.content.innerHTML = '';
},
_decorateHeadings: function () {
var h2s = this.$.content.querySelectorAll('h2');
for (var i = 0; i < h2s.length; i++) {
var link = document.createElement('a');
link.className = 'reference-link';
link.href = '#' + h2s[i].id;
var icon = document.createElement('iron-icon');
icon.icon = 'link';
link.appendChild(icon);
h2s[i].parentNode.insertBefore(link, h2s[i]);
}
},
_highlight: function () {
var els = this.$.content.querySelectorAll('pre code');
for (var i = 0; i < els.length; i++) {
var code = els[i].textContent;
var event = this.fire('syntax-highlight', { code: code });
if (event.detail.code && !els[i].highlighted) {
els[i].highlighted = true;
els[i].innerHTML = event.detail.code;
}
}
},
_guideUrl: function (name) {
return '/guides/' + name;
},
updateMeta: function () {
this.fire('page-meta', { title: this.guide.title });
},
nav: function (e) {
var name = e.currentTarget.getAttribute('name');
if (this.name !== name) {
this.router.go('/guides/' + name);
}
},
_catalogGuideError: function () {
this.router.go('/404');
}
});
Polymer({
is: 'page-not-found',
attached: function () {
this.fire('page-meta', { title: 'Page not found' });
}
});
Polymer({
is: 'app-shell',
listeners: {
'nav': 'handleNav',
'page-meta': 'updateTitle',
'cart-close': 'cartClose',
'cart-open': 'cartOpen',
'cart-add': 'cartAdd',
'cart-remove': 'cartRemove',
'toast': 'showToast'
},
_toast: null,
toggleSearch: function () {
this.$.search.active = !this.$.search.active;
},
performSearch: function (e) {
e.preventDefault();
if (this.query.length)
this.$.router.go('/elements?q=' + this.query);
},
handleNav: function (_, nav) {
this.$.router.go(nav.url);
this.$.cartpanel.closeDrawer();
},
updateTitle: function (_, detail) {
if (detail.title && detail.title.length) {
document.title = detail.title + ' - Polymer Element Catalog';
} else {
document.title = 'Polymer Element Catalog';
}
},
cartClose: function () {
this.$.cartpanel.closeDrawer();
},
cartOpen: function () {
this.$.cartpanel.openDrawer();
},
cartAdd: function (e, el) {
this.$.cart.add(el);
},
cartRemove: function (e, el) {
this.$.cart.remove(el);
},
showToast: function (e, detail) {
if (!this._toast) {
this._toast = document.createElement('paper-toast');
Polymer.dom(this.$.router).appendChild(this._toast);
}
this._toast.text = detail.text;
this.async(this._toast.show.bind(this._toast), 1);
},
trackPageview: function (e, detail) {
this.debounce('pageview', function () {
var loc = window.location.pathname + window.location.search;
ga('send', 'pageview', {
location: loc,
title: document.title
});
ga('set', 'page', loc);
}, 2000);
}
});