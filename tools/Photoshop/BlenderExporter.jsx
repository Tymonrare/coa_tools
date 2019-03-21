#target Photoshop

var exporter_version = "v1.0 Beta";
var exportTemplate = {
	name: 'template',
	resource_path: 'sprites/',
	scene: {
		offset: [0, 0],
		size: [1280, 720]
	},
	nodes: []
}

var win = new Window("dialog", 'Json Exporter' + exporter_version, [0, 0, 445, 157], );
var document = app.activeDocument;
var layers = document.layers;

//=== { Entry } ===\

function main(export_path, export_name, crop_to_dialog_bounds, crop_layers, export_json) {
	exportTemplate.resource_path = export_name + '/';

	//=== { Prepare } ===\\

	var init_units = app.preferences.rulerUnits;
	app.preferences.rulerUnits = Units.PIXELS;
	// check if folder exists. if not, create one

	var tmp_layers = document.layers;

	try {
		duplicate_into_new_doc();
		var dupli_doc = app.activeDocument;
	} catch (e) {
		alert(e);
		win.close();
		return;
	}

	/// deselect all layers and select first with this hack of adding a new layer and then deleting it again
	var testlayer = dupli_doc.artLayers.add();
	testlayer.remove();
	///

	function forEachLayer(doc, func) {
		for (var i = 0; i < doc.layers.length; i++) {
			var layer = doc.layers[i];
			dupli_doc.activeLayer = layer;
			func(layer, i);
		}
	}

	function merge(doc) {
		forEachLayer(doc, function (layer) {
			var props = propsByName(layer.name);

			if (!props.batch && !props.group && !props.frames) {
				flatten_layer(dupli_doc, layer.name);
			} else if (layer.typename == "LayerSet") {
				merge(layer);
			}
		});
	}
	merge(dupli_doc);

	//=== { Image process } ===\\

	function process(doc, parentNode, savePath) {
		var nodesList = parentNode.nodes;

		forEachLayer(doc, function (layer, index) {
			if(layer.name[0] == '#') return;

			var props = propsByName(layer.name);

			if(props.group && layer.typename == "LayerSet"){
				var file_path = savePath + props.id + "/"; //directory

				var node = makeNode({
					name: props.id,
					file_path: file_path,
					type: 'group',
					properties: props,
					position: [0, -index, 0],
				});
				node.nodes = [];
				nodesList.push(node);

				process(layer, node, file_path);

				return;
			}

			//=== { Settings } ===\\

			var bounds = [layer.bounds[0].as("px"), layer.bounds[1].as("px"), layer.bounds[2].as("px"), layer.bounds[3].as("px")];
			var bounds_width = bounds[2] - bounds[0];
			var bounds_height = bounds[3] - bounds[1];

			var margin = props.margin||5;

			//=== { Make document } ===\\

			var tmp_doc = app.documents.add(dupli_doc.width, dupli_doc.height, dupli_doc.resolution, props.id, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
			var layer_pos = Array(bounds[0] - margin, -index, bounds[1] - margin);


			// duplicate layer into new doc and crop to layerbounds with margin
			app.activeDocument = dupli_doc;
			layer.duplicate(tmp_doc, ElementPlacement.INSIDE);
			app.activeDocument = tmp_doc;
			var crop_bounds = bounds;

			if (crop_to_dialog_bounds == true) {
				if (crop_bounds[0] < 0) {
					crop_bounds[0] = 0
				};
				if (crop_bounds[1] < 0) {
					crop_bounds[1] = 0
				};
				if (crop_bounds[2] > document.width.as("px")) {
					crop_bounds[2] = document.width.as("px")
				};
				if (crop_bounds[3] > document.height.as("px")) {
					crop_bounds[3] = document.height.as("px")
				};
			}

			crop_bounds[0] -= margin;
			crop_bounds[1] -= margin;
			crop_bounds[2] += margin;
			crop_bounds[3] += margin;

			if (crop_layers == true) {
				tmp_doc.crop(crop_bounds);
			}

			//move to align anchor
			var anchor = [0.5, 0.5]
			layer_pos[0] += tmp_doc.width.as("px")*anchor[0];
			layer_pos[2] += tmp_doc.height.as("px")*anchor[1];

			// make file path -> cut off commands
			var file_name = props.id;
			var file_path = savePath + file_name + ".png";

			//--- { Save batch or simple image } ---\\

			// check if layer is a group with sprite setting
			if (props.frames) {
				var sprites = tmp_doc.layers[0].layers;

				//calc tile size {
				var sprite_count = sprites.length;
				var columns = props.columns;

				if(!columns) {
					var maxW = sprite_count*tmp_doc.width.as('px');
					var maxH = sprite_count*tmp_doc.height.as('px');

					var d = maxW/maxH;

					columns = Math.max(1, Math.min(Math.ceil(2/d), sprite_count));
				}
				// }

				var frames = [];
				var k = 0;
				for (var j = 0; j < sprites.length; j++) {
					if (j > 0 && j % columns == 0) {
						k = k + 1;
					}
					var x = tmp_doc.width * (j % columns);
					var y = tmp_doc.height * k;
					sprites[j].translate(x, y);

					//(1) method - few sprites on texture
					frames.push({
						id:sprites[j].name,
						bounds: [x.as("px"), y.as("px"), tmp_doc.width.as("px"), tmp_doc.height.as("px")]
					});
				}

				nodesList.push(makeNode({
					name: file_name,
					file_path: file_path,
					position: layer_pos,
					frames: frames,
					type: 'frames',
					properties: props,
					pivot_offset: anchor,
					size: [tmp_doc.width.as("px"), tmp_doc.height.as("px")]
				}));

				extend_document_size(tmp_doc.width * columns, tmp_doc.height * (k + 1));
			}
			//(2) method - only one sprite on texture
			else
				nodesList.push(makeNode({
					name: file_name,
					file_path: file_path,
					position: layer_pos,
					type: 'sprite',
					properties: props,
					bounds: [0, 0, tmp_doc.width.as("px"), tmp_doc.height.as("px")],
					pivot_offset: anchor,
					size: [tmp_doc.width.as("px"), tmp_doc.height.as("px")]
				}));

				// do save stuff
				var export_folder = new Folder(export_path + "/" + savePath);
				if (export_folder.exists)
					export_folder.remove();

				export_folder.create();

				tmp_doc.exportDocument(File(export_path + "/" + file_path), ExportType.SAVEFORWEB, options);

			// close tmp doc again
			tmp_doc.close(SaveOptions.DONOTSAVECHANGES);
		});
	}
	process(dupli_doc, exportTemplate, exportTemplate.resource_path);

	dupli_doc.close(SaveOptions.DONOTSAVECHANGES);

	if (export_json == true) {
		save(export_path, export_name);
	}

	app.preferences.rulerUnits = init_units;
}

function makeNode(props) {
	if(!props.position)
		props.position = [0,0,0];
	if(!props.pivot_offset)
		props.pivot_offset = [0,0];

	var p = props.file_path;
		p = p.slice(p.indexOf('/') + 1);
		p = p.substring(0, p.lastIndexOf('/'));
		p = p.replace(/\//g, '.');
		props.node_path = p;

	var node = {
		name: props.name,
		type: props.type,
		properties: props.properties,
		node_path: props.node_path,
		resource_path: props.file_path,
		transform: {
			pivot_offset: props.pivot_offset,
			rotation: 0,
			scale: [1, 1],
			opacity: 1,
			size: props.size,
			z: props.position[1],
			position: [props.position[0], props.position[2]],
		},
		bounds: props.bounds,
		frames: props.frames
	};

	return node;
}

/*

possible patterns:

1. unic_id other=props --flags
2. some=props id=name

 */
function propsByName(name) {
	var props = {
		id: undefined
	}

	var rawProps = name.split(' ');

	if (rawProps[0].indexOf('=') < 0)
		props.id = rawProps[0];

	for (var i in rawProps) {
		var prop = rawProps[i];

		if (prop.indexOf('=') >= 0) {
			var p = prop.split('=');
			props[p[0]] = toVal(p[1]);
		} else if (prop.indexOf('--') >= 0) {
			props[prop.slice(2)] = true;
		}
	}

	return props;

	function toVal(val) {
		switch (val) {
		case 'true':
			return true;
		case 'false':
			return false;
		case 'null':
			return null;
		}
		//avoid '[] to 0' convertion
		if (typeof val == 'object')
			return val;

		var num = Number(val);
		if (!isNaN(num))
			return num;
		return val;
	}
}

function save(export_path, export_name) {
	//first calc bound for all groups
	deepForEach(exportTemplate.nodes, function(node){
		if(node.type != 'group') return; //only interested in groups

		var maxX = 0, maxY = 0, minX = exportTemplate.scene.size[0], minY = exportTemplate.scene.size[1];
		deepForEach(node.nodes, function(subnode){

			//because group always in zero will get wrong sizes
			if(subnode.properties.group)
				return;

			var t = subnode.transform;

			var size = t.size||[0,0]

			var minPX = t.position[0] - size[0]*t.pivot_offset[0];
			var minPY = t.position[1] - size[1]*t.pivot_offset[1];
			if(minPX < minX)
				minX = minPX;
			if(minPY < minY)
				minY = minPY;

			if(!t.size) return;

			var maxPX = t.position[0] + t.size[0]*(1-t.pivot_offset[0]);
			var msxPY = t.position[1] + t.size[1]*(1-t.pivot_offset[1]);
			if(maxPX > maxX)
				maxX = maxPX;
			if(msxPY > maxY)
				maxY = msxPY;
		}, 'nodes');

		node.transform.size = [maxX - minX, maxY - minY];
		
		//all groups set in 0 by default
		//set pos to top-left childs pos
		node.transform.position[0] += minX;
		node.transform.position[1] += minY;
		//now shift back all childs
		deepForEach(node.nodes, function(subnode){
			subnode.transform.position[0] -= minX;
			subnode.transform.position[1] -= minY;
		});
	}, 'nodes');

	exportTemplate.scene.size = [document.width.as("px"), document.height.as("px")]
	if (win.center_sprites.value)
		exportTemplate.scene.offset = [exportTemplate.scene.size[0] *  -.5, exportTemplate.scene.size[1] * .5];

	exportTemplate.name = export_name;

	var json_file = new File(export_path + "/" + export_name + ".json");
	json_file.open('w');
	json_file.write(JSON.stringify(exportTemplate));
	json_file.close();
}

function execute() {
	win.export_name.text = String(win.export_name.text).split(' ').join('_');
	app.activeDocument.info.caption = win.export_path.text;
	app.activeDocument.info.captionWriter = win.export_name.text;
	//export_sprites(win.export_path.text, win.export_name.text, win.limit_layer.value, win.center_sprites.value);
	app.activeDocument.suspendHistory("Export selected Sprites", "main(win.export_path.text, win.export_name.text, win.limit_layer.value,win.crop_layers.value,win.export_json.value)");
	win.close();
}

//Save Options for PNGs
var options = new ExportOptionsSaveForWeb();
options.format = SaveDocumentType.PNG;
options.PNG8 = false;
options.transparency = true;
options.optimized = true;

//=== { Window } ===\\

function path_button() {
	var folder_path = Folder.selectDialog("Select Place to save");
	if (folder_path != null) {
		win.export_path.text = folder_path;
		app.activeDocument.info.caption = folder_path;
	}
}

with (win) {
	win.export_path = add("edittext", [85, 15, 365, 35], undefined);
	win.sText = add("statictext", [5, 20, 75, 40], 'Export Path:');
	win.limit_layer = add("checkbox", [5, 70, 180, 90], 'Limit layers by Document');
	win.center_sprites = add("checkbox", [5, 110, 180, 130], 'Center Sprites in Blender');
	win.export_button = add("button", [340, 130, 440, 152], 'Export Layers');
	win.export_name = add("edittext", [85, 40, 440, 60], undefined);
	win.sText2 = add("statictext", [5, 45, 85, 65], 'Export Name:');
	win.button_path = add("button", [370, 13, 440, 35], 'select');
	win.export_json = add("checkbox", [5, 130, 180, 150], 'Export Json File');
	win.crop_layers = add("checkbox", [5, 90, 180, 110], 'Crop Layers');
}

win.export_path.text = app.activeDocument.info.caption;
win.export_name.text = app.activeDocument.info.captionWriter;
win.export_button.onClick = execute;
win.button_path.onClick = path_button;
win.center_sprites.value = true;
win.limit_layer.value = true;
win.crop_layers.value = true;
win.export_json.value = true;

//=== {utils} ===\\

function deepForEach(root, callback, reqProperty){
	for(var i in root){
		var node = root[i];
		callback(node);

		if (node[reqProperty]) deepForEach(node[reqProperty], callback, reqProperty);
	}
}

function deselect_all_layers() {
	var desc01 = new ActionDescriptor();
	var ref01 = new ActionReference();
	ref01.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
	desc01.putReference(charIDToTypeID('null'), ref01);
	executeAction(stringIDToTypeID('selectNoLayers'), desc01, DialogModes.NO);
}

function flatten_layer(document, name) {
	// =======================================================
	var idMk = charIDToTypeID("Mk  ");
	var desc54 = new ActionDescriptor();
	var idnull = charIDToTypeID("null");
	var ref47 = new ActionReference();
	var idlayerSection = stringIDToTypeID("layerSection");
	ref47.putClass(idlayerSection);
	desc54.putReference(idnull, ref47);
	var idFrom = charIDToTypeID("From");
	var ref48 = new ActionReference();
	var idLyr = charIDToTypeID("Lyr ");
	var idOrdn = charIDToTypeID("Ordn");
	var idTrgt = charIDToTypeID("Trgt");
	ref48.putEnumerated(idLyr, idOrdn, idTrgt);
	desc54.putReference(idFrom, ref48);
	var idlayerSectionStart = stringIDToTypeID("layerSectionStart");
	desc54.putInteger(idlayerSectionStart, 161);
	var idlayerSectionEnd = stringIDToTypeID("layerSectionEnd");
	desc54.putInteger(idlayerSectionEnd, 162);
	var idNm = charIDToTypeID("Nm  ");
	desc54.putString(idNm, name);
	executeAction(idMk, desc54, DialogModes.NO);
	// =======================================================
	var idMrgtwo = charIDToTypeID("Mrg2");
	executeAction(idMrgtwo, undefined, DialogModes.NO);
	document.activeLayer.name = name;
}

function extend_document_size(size_x, size_y) {
	// =======================================================
	var idCnvS = charIDToTypeID("CnvS");
	var desc8 = new ActionDescriptor();
	var idWdth = charIDToTypeID("Wdth");
	var idPxl = charIDToTypeID("#Pxl");
	desc8.putUnitDouble(idWdth, idPxl, size_x);
	var idHght = charIDToTypeID("Hght");
	var idPxl = charIDToTypeID("#Pxl");
	desc8.putUnitDouble(idHght, idPxl, size_y);
	var idHrzn = charIDToTypeID("Hrzn");
	var idHrzL = charIDToTypeID("HrzL");
	var idLeft = charIDToTypeID("Left");
	desc8.putEnumerated(idHrzn, idHrzL, idLeft);
	var idVrtc = charIDToTypeID("Vrtc");
	var idVrtL = charIDToTypeID("VrtL");
	var idTop = charIDToTypeID("Top ");
	desc8.putEnumerated(idVrtc, idVrtL, idTop);
	executeAction(idCnvS, desc8, DialogModes.NO);
}

function duplicate_into_new_doc() {
	// =======================================================
	var idMk = charIDToTypeID("Mk  ");
	var desc231 = new ActionDescriptor();
	var idnull = charIDToTypeID("null");
	var ref114 = new ActionReference();
	var idDcmn = charIDToTypeID("Dcmn");
	ref114.putClass(idDcmn);
	desc231.putReference(idnull, ref114);
	var idNm = charIDToTypeID("Nm  ");
	desc231.putString(idNm, """dupli_layers_doc""");
	var idUsng = charIDToTypeID("Usng");
	var ref115 = new ActionReference();
	var idLyr = charIDToTypeID("Lyr ");
	var idOrdn = charIDToTypeID("Ordn");
	var idTrgt = charIDToTypeID("Trgt");
	ref115.putEnumerated(idLyr, idOrdn, idTrgt);
	desc231.putReference(idUsng, ref115);
	var idVrsn = charIDToTypeID("Vrsn");
	desc231.putInteger(idVrsn, 5);
	executeAction(idMk, desc231, DialogModes.NO);
}

//JSON

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== "object") {
	JSON = {};
}

(function () {
	"use strict";

	var rx_one = /^[\],:{}\s]*$/;
	var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
	var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
	var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
	var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
	var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

	function f(n) {
		// Format integers to have at least two digits.
		return (n < 10)
		 ? "0" + n
		 : n;
	}

	function this_value() {
		return this.valueOf();
	}

	if (typeof Date.prototype.toJSON !== "function") {

		Date.prototype.toJSON = function () {

			return isFinite(this.valueOf())
			 ? (
				this.getUTCFullYear()
				 + "-"
				 + f(this.getUTCMonth() + 1)
				 + "-"
				 + f(this.getUTCDate())
				 + "T"
				 + f(this.getUTCHours())
				 + ":"
				 + f(this.getUTCMinutes())
				 + ":"
				 + f(this.getUTCSeconds())
				 + "Z")
			 : null;
		};

		Boolean.prototype.toJSON = this_value;
		Number.prototype.toJSON = this_value;
		String.prototype.toJSON = this_value;
	}

	var gap;
	var indent;
	var meta;
	var rep;

	function quote(string) {

		// If the string contains no control characters, no quote characters, and no
		// backslash characters, then we can safely slap some quotes around it.
		// Otherwise we must also replace the offending characters with safe escape
		// sequences.

		rx_escapable.lastIndex = 0;
		return rx_escapable.test(string)
		 ? "\"" + string.replace(rx_escapable, function (a) {
			var c = meta[a];
			return typeof c === "string"
			 ? c
			 : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
		}) + "\""
		 : "\"" + string + "\"";
	}

	function str(key, holder) {

		// Produce a string from holder[key].

		var i; // The loop counter.
		var k; // The member key.
		var v; // The member value.
		var length;
		var mind = gap;
		var partial;
		var value = holder[key];

		// If the value has a toJSON method, call it to obtain a replacement value.

		if (
			value
			 && typeof value === "object"
			 && typeof value.toJSON === "function") {
			value = value.toJSON(key);
		}

		// If we were called with a replacer function, then call the replacer to
		// obtain a replacement value.

		if (typeof rep === "function") {
			value = rep.call(holder, key, value);
		}

		// What happens next depends on the value's type.

		switch (typeof value) {
		case "string":
			return quote(value);

		case "number":

			// JSON numbers must be finite. Encode non-finite numbers as null.

			return (isFinite(value))
			 ? String(value)
			 : "null";

		case "boolean":
		case "null":

			// If the value is a boolean or null, convert it to a string. Note:
			// typeof null does not produce "null". The case is included here in
			// the remote chance that this gets fixed someday.

			return String(value);

			// If the type is "object", we might be dealing with an object or an array or
			// null.

		case "object":

			// Due to a specification blunder in ECMAScript, typeof null is "object",
			// so watch out for that case.

			if (!value) {
				return "null";
			}

			// Make an array to hold the partial results of stringifying this object value.

			gap += indent;
			partial = [];

			// Is the value an array?

			if (Object.prototype.toString.apply(value) === "[object Array]") {

				// The value is an array. Stringify every element. Use null as a placeholder
				// for non-JSON values.

				length = value.length;
				for (i = 0; i < length; i += 1) {
					partial[i] = str(i, value) || "null";
				}

				// Join all of the elements together, separated with commas, and wrap them in
				// brackets.

				v = partial.length === 0
					 ? "[]"
					 : gap
					 ? (
						"[\n"
						 + gap
						 + partial.join(",\n" + gap)
						 + "\n"
						 + mind
						 + "]")
					 : "[" + partial.join(",") + "]";
				gap = mind;
				return v;
			}

			// If the replacer is an array, use it to select the members to be stringified.

			if (rep && typeof rep === "object") {
				length = rep.length;
				for (i = 0; i < length; i += 1) {
					if (typeof rep[i] === "string") {
						k = rep[i];
						v = str(k, value);
						if (v) {
							partial.push(quote(k) + (
									(gap)
									 ? ": "
									 : ":") + v);
						}
					}
				}
			} else {

				// Otherwise, iterate through all of the keys in the object.

				for (k in value) {
					if (Object.prototype.hasOwnProperty.call(value, k)) {
						v = str(k, value);
						if (v) {
							partial.push(quote(k) + (
									(gap)
									 ? ": "
									 : ":") + v);
						}
					}
				}
			}

			// Join all of the member texts together, separated with commas,
			// and wrap them in braces.

			v = partial.length === 0
				 ? "{}"
				 : gap
				 ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
				 : "{" + partial.join(",") + "}";
			gap = mind;
			return v;
		}
	}

	// If the JSON object does not yet have a stringify method, give it one.

	if (typeof JSON.stringify !== "function") {
		meta = { // table of character substitutions
			"\b": "\\b",
			"\t": "\\t",
			"\n": "\\n",
			"\f": "\\f",
			"\r": "\\r",
			"\"": "\\\"",
			"\\": "\\\\"
		};
		JSON.stringify = function (value, replacer, space) {

			// The stringify method takes a value and an optional replacer, and an optional
			// space parameter, and returns a JSON text. The replacer can be a function
			// that can replace values, or an array of strings that will select the keys.
			// A default replacer method can be provided. Use of the space parameter can
			// produce text that is more easily readable.

			var i;
			gap = "";
			indent = "";

			// If the space parameter is a number, make an indent string containing that
			// many spaces.

			if (typeof space === "number") {
				for (i = 0; i < space; i += 1) {
					indent += " ";
				}

				// If the space parameter is a string, it will be used as the indent string.

			} else if (typeof space === "string") {
				indent = space;
			}

			// If there is a replacer, it must be a function or an array.
			// Otherwise, throw an error.

			rep = replacer;
			if (replacer && typeof replacer !== "function" && (
					typeof replacer !== "object"
					 || typeof replacer.length !== "number")) {
				throw new Error("JSON.stringify");
			}

			// Make a fake root object containing our value under the key of "".
			// Return the result of stringifying the value.

			return str("", {
				"": value
			});
		};
	}

	// If the JSON object does not yet have a parse method, give it one.

	if (typeof JSON.parse !== "function") {
		JSON.parse = function (text, reviver) {

			// The parse method takes a text and an optional reviver function, and returns
			// a JavaScript value if the text is a valid JSON text.

			var j;

			function walk(holder, key) {

				// The walk method is used to recursively walk the resulting structure so
				// that modifications can be made.

				var k;
				var v;
				var value = holder[key];
				if (value && typeof value === "object") {
					for (k in value) {
						if (Object.prototype.hasOwnProperty.call(value, k)) {
							v = walk(value, k);
							if (v !== undefined) {
								value[k] = v;
							} else {
								delete value[k];
							}
						}
					}
				}
				return reviver.call(holder, key, value);
			}

			// Parsing happens in four stages. In the first stage, we replace certain
			// Unicode characters with escape sequences. JavaScript handles many characters
			// incorrectly, either silently deleting them, or treating them as line endings.

			text = String(text);
			rx_dangerous.lastIndex = 0;
			if (rx_dangerous.test(text)) {
				text = text.replace(rx_dangerous, function (a) {
						return (
							"\\u"
							 + ("0000" + a.charCodeAt(0).toString(16)).slice(-4));
					});
			}

			// In the second stage, we run the text against regular expressions that look
			// for non-JSON patterns. We are especially concerned with "()" and "new"
			// because they can cause invocation, and "=" because it can cause mutation.
			// But just to be safe, we want to reject all unexpected forms.

			// We split the second stage into 4 regexp operations in order to work around
			// crippling inefficiencies in IE's and Safari's regexp engines. First we
			// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
			// replace all simple value tokens with "]" characters. Third, we delete all
			// open brackets that follow a colon or comma or that begin the text. Finally,
			// we look to see that the remaining characters are only whitespace or "]" or
			// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

			if (
				rx_one.test(
					text
					.replace(rx_two, "@")
					.replace(rx_three, "]")
					.replace(rx_four, ""))) {

				// In the third stage we use the eval function to compile the text into a
				// JavaScript structure. The "{" operator is subject to a syntactic ambiguity
				// in JavaScript: it can begin a block or an object literal. We wrap the text
				// in parens to eliminate the ambiguity.

				j = eval("(" + text + ")");

				// In the optional fourth stage, we recursively walk the new structure, passing
				// each name/value pair to a reviver function for possible transformation.

				return (typeof reviver === "function")
				 ? walk({
					"": j
				}, "")
				 : j;
			}

			// If the text is not JSON parseable, then a SyntaxError is thrown.

			throw new SyntaxError("JSON.parse");
		};
	}
}
	());

win.center();
win.show();
