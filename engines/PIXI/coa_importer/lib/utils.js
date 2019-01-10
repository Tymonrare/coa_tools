
function forEachNodeInTree(root, callback) {
	root.forEach((node) => {
		callback(node);

		if (node.nodes) forEachNodeInTree(node.nodes, callback);
	});
}

function sortAllNodesInTree(root, sorter){
	root.sort(sorter);
	root.forEach((node) => {
		if (node.nodes) sortAllNodesInTree(node.nodes, sorter);
	});
}

export { forEachNodeInTree, sortAllNodesInTree };
