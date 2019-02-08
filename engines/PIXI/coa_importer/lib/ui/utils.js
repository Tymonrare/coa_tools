/** @format */

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

export { applyNodeProps };
