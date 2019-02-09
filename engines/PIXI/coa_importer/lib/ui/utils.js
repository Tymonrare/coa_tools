/** @format */
import { Sprite } from 'pixi.js';

function applyNodeProps(node, object) {
	object.visible = !node.properties.hide;

	object.rotation = node.transform.rotation; //radians
	object.alpha = node.transform.opacity;

	object.scale.set(node.transform.scale[0], node.transform.scale[1]);
	object.position.set(node.transform.position[0], node.transform.position[1]);
	if (node.transform.pivot_offset && object.anchor)
		object.anchor.set(node.transform.pivot_offset[0], node.transform.pivot_offset[1]);

	//Add node to group if it has so
	if (node.properties.node_group) {
		let gr = node.properties.node_group;
		object.scene.groups = object.scene.groups || {};
		if (!object.scene.groups[gr]) object.scene.groups[gr] = {};

		object.scene.groups[gr][node.name] = object;

		object.group = gr;
	}
}

function createMaskForNode(node) {
	let maskS = new PIXI.Sprite(PIXI.Texture.WHITE);

	let t = node.transform;
	maskS.width = t.size[0];
	maskS.height = t.size[1];
	maskS.anchor.set(t.pivot_offset[0], t.pivot_offset[1]);
	maskS.position.x = t.position[0];
	maskS.position.y = t.position[1];

	return maskS;
}

export { applyNodeProps, createMaskForNode };
