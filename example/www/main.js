import { computed, effect, reactive } from "@vue/reactivity";
import { parse } from "@barelyhuman/resume-lang-parser";

const textElm = document.getElementById("code");
const previewContainerElm = document.getElementById("preview");
const previewSection = previewContainerElm.querySelector("pre");

const sub = reactive({ code: textElm.textContent, error: undefined });

const jsonAST = computed(() => {
  const ast = parse(sub.code, {});
  return JSON.stringify(
    ast,
    (k, v) => {
      if (k === "parent") return undefined;
      return v;
    },
    4
  );
});

effect(() => {
  previewSection.innerHTML = jsonAST.value;
});

const debouncedUpdateSource = debounce(updateSource, 350);

textElm.addEventListener("keyup", (e) => {
  debouncedUpdateSource(e.target.value);
});

function updateSource(code) {
  sub.code = code;
}

function debounce(fn, delay) {
  let id;
  return (...args) => {
    if (id) clearInterval(id);
    id = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
