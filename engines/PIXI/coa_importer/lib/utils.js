
function forEachNodeInTree(root, callback) {
	root.forEach((node) => {
		callback(node);

		if (node.nodes) forEachNodeInTree(node.nodes, callback);
	});
}

export { forEachNodeInTree };
