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
		object.groups = object.groups || {};
		if (!object.groups[gr]) object.groups[gr] = {};

		//tabs hide
		for (let i in object.groups[gr]) object.groups[gr][i].visible = false;

		object.groups[gr][node.name] = object;

		object.group = gr;
	}
}

export { applyNodeProps };
