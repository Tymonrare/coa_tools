/** @format */

export function debugBoundsDraw(root) {
	try {
		function parse(arr) {
			arr.forEach((child, i) => {
				if (child.debugContainer_) {
					child.destroy();
					return;
				}

				let bounds = child.getLocalBounds();

				let container = new PIXI.Container();
				container.debugContainer_ = true;
				let graphics = new PIXI.Graphics();
				container.addChild(graphics);

				graphics.lineStyle(2, 0x00, 0.2);
				graphics.beginFill(0xffffff, 0.05);
				graphics.drawRect(bounds.x, bounds.y, bounds.width, bounds.height);
				graphics.endFill();

				let text = new PIXI.Text(child.name, { align: 'center', fontSize: 12 });
				if (child.position.x && child.position.y) text.anchor.set(0.5);
				container.addChild(text);

				requestAnimationFrame(() => {
					child.addChild(container);
				});

				if (child.children) parse(child.children);
			});
		}
		parse(root.children);
	} catch (err) {
		console.log(err);
	}
}
export function debugTreePrint(scene, details = false) {
	console.log(
		`%c${scene.name} scene tree ==================================`,
		'font-weight: bold; font-size: 14px;'
	);
	try {
		let text = '';
		function parse(root, depth) {
			root.forEach((node, i) => {
				text += '> ';
				if (depth) {
					text += '|  '.repeat(depth - 1);
					if (i + 1 < root.length || node.nodes) text += '├';
					else text += '└';

					text += '─'.repeat(2) + ' ';
				}
				text += `{ ${node.name} }  ${node.properties.type || node.type}`;

				if (details) {
					text += '             [ ';
					for (let key in node.properties) {
						if (key != 'type') text += `${key}=${node.properties[key]} `;
					}
					text += ']';
				}

				text += '\n';

				if (node.nodes) parse(node.nodes, depth + 1);
			});
		}
		parse(scene.nodes, 0);

		console.log(text);
	} catch (err) {
		console.log(err);
	} finally {
		console.log(
			`%c${scene.name} scene tree ==================================`,
			'font-weight: bold; font-size: 14px;'
		);
	}
}
