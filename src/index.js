import observer from "@cocreate/observer";
import position from "./position";
import "./index.css";

function init() {
	let elements = document.querySelectorAll("[moveable], [positionable]");
	initElements(elements);
}

function initElements(elements) {
	for (let element of elements) initElement(element);
}

function initElement(element) {
	element.position = new position(element, element.parentElement);
}

observer.init({
	name: "positionAddedNodes",
	types: ["addedNodes"],
	selector: "[moveable], [positionable]",
	callback: (mutation) => {
		initElement(mutation.target);
	}
});

observer.init({
	name: "positionAttributes",
	types: ["attributes"],
	attributeFilter: ["moveable", "positionable"],
	callback: (mutation) => {
		initElement(mutation.target);
	}
});

init();

export default position;
