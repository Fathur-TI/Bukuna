"""
Compiler & Offline Bundler untuk BUKUNA
Mengompilasi langsung seluruh file modular di /src (React + JSX + Tailwind CSS)
menjadi bundle mandiri dengan In-Place DOM Reconciler sehingga fokus input tidak pernah hilang.
"""
import os
import re

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

MODULE_ORDER = [
    "src/lib/supabaseClient.js",
    "src/services/authService.js",
    "src/services/commentService.js",
    "src/data/stories.js",
    "src/data/quizzes.js",
    "src/services/storyStorage.js",
    "src/services/adminService.js",
    "src/utils/imageCompress.js",
    "src/hooks/useDebounce.js",
    "src/hooks/useAutosave.js",
    "src/hooks/useSpeech.js",
    "src/hooks/useQuiz.js",
    "src/context/BukunaContext.jsx",
    "src/components/Logo.jsx",
    "src/components/ColorfulTitle.jsx",
    "src/components/CatAvatar.jsx",
    "src/components/HeroIllustration.jsx",
    "src/components/StoryIllustration.jsx",
    "src/components/TextInput.jsx",
    "src/components/StoryCard.jsx",
    "src/components/Header.jsx",
    "src/components/Navigation.jsx",
    "src/components/ConfettiEffect.jsx",
    "src/components/ParentReviewsSection.jsx",
    "src/components/editor/ImageCropper.jsx",
    "src/components/editor/ImageUploader.jsx",
    "src/components/editor/StoryInfoForm.jsx",
    "src/components/editor/PageList.jsx",
    "src/components/editor/PageEditor.jsx",
    "src/components/editor/StoryQuizBuilder.jsx",
    "src/components/editor/StoryPreview.jsx",
    "src/components/quiz/Mascot.jsx",
    "src/components/quiz/StarProgress.jsx",
    "src/components/quiz/QuizFeedback.jsx",
    "src/components/quiz/QuizStart.jsx",
    "src/components/quiz/QuizResult.jsx",
    "src/components/quiz/PickImage.jsx",
    "src/components/quiz/CountObjects.jsx",
    "src/components/quiz/MatchPairs.jsx",
    "src/components/quiz/ColorShape.jsx",
    "src/components/quiz/OrderStory.jsx",
    "src/components/quiz/FeelingPick.jsx",
    "src/components/quiz/QuizQuestion.jsx",
    "src/pages/SplashPage.jsx",
    "src/pages/AuthChoicePage.jsx",
    "src/pages/LoginPage.jsx",
    "src/pages/RegisterPage.jsx",
    "src/pages/HomePage.jsx",
    "src/pages/CollectionPage.jsx",
    "src/pages/FavoritesPage.jsx",
    "src/pages/ProfilePage.jsx",
    "src/pages/MyStories.jsx",
    "src/pages/CreateStory.jsx",
    "src/pages/EditStory.jsx",
    "src/pages/QuizHubPage.jsx",
    "src/pages/QuizPlayPage.jsx",
    "src/pages/StoryDetailPage.jsx",
    "src/pages/ReadStoryPage.jsx",
    "src/pages/FinishStoryPage.jsx",
    "src/pages/AboutPage.jsx",
    "src/pages/SearchPage.jsx",
    "src/pages/AdminDashboardPage.jsx",
    "src/App.jsx",
]


class JSXCompiler:
    def __init__(self, code):
        self.code = code
        self.n = len(code)
        self.i = 0

    def compile(self):
        return self.parse_js(stop_chars=set())

    def parse_js(self, stop_chars):
        out = []
        while self.i < self.n:
            ch = self.code[self.i]
            if ch in stop_chars:
                break

            if self.code.startswith("//", self.i):
                end = self.code.find("\n", self.i)
                if end == -1:
                    out.append(self.code[self.i :])
                    self.i = self.n
                else:
                    out.append(self.code[self.i : end + 1])
                    self.i = end + 1
                continue

            if self.code.startswith("/*", self.i):
                end = self.code.find("*/", self.i + 2)
                if end == -1:
                    out.append(self.code[self.i :])
                    self.i = self.n
                else:
                    out.append(self.code[self.i : end + 2])
                    self.i = end + 2
                continue

            if ch in ("'", '"', "`"):
                out.append(self.read_string(ch))
                continue

            if ch == "{" and "}" in stop_chars:
                self.i += 1
                inner = self.parse_js(stop_chars={"}"})
                if self.i < self.n and self.code[self.i] == "}":
                    self.i += 1
                out.append("{" + inner + "}")
                continue

            if ch == "<" and self.is_jsx_start(out):
                out.append(self.parse_jsx_element())
                continue

            out.append(ch)
            self.i += 1

        return "".join(out)

    def read_string(self, quote):
        self.i += 1
        out = [quote]
        while self.i < self.n:
            c = self.code[self.i]
            if c == "\\":
                out.append(self.code[self.i : self.i + 2])
                self.i += 2
                continue
            if quote == "`" and self.code.startswith("${", self.i):
                out.append("${")
                self.i += 2
                expr = self.parse_js(stop_chars={"}"})
                out.append(expr)
                if self.i < self.n and self.code[self.i] == "}":
                    out.append("}")
                    self.i += 1
                continue
            out.append(c)
            self.i += 1
            if c == quote:
                break
        return "".join(out)

    def is_jsx_start(self, prev_tokens):
        if self.code.startswith("<>", self.i):
            return True
        m = re.match(r"^<([A-Za-z_][A-Za-z0-9_.-]*)(\s|>|/>|\n)", self.code[self.i :])
        if not m:
            return False
        prev_str = "".join(prev_tokens)
        prev_str = re.sub(r"/\*[\s\S]*?\*/|//[^\n]*", "", prev_str).rstrip()
        if not prev_str:
            return True
        last_char = prev_str[-1]
        if last_char in ("(", ",", "=", ":", "[", "?", "!", "&", "|", "{", ";", ">"):
            return True
        if re.search(r"\b(return|case|=>)\s*$", prev_str):
            return True
        return False

    def skip_ws(self):
        while self.i < self.n and self.code[self.i].isspace():
            self.i += 1

    def parse_jsx_element(self):
        assert self.code[self.i] == "<"
        self.i += 1

        if self.i < self.n and self.code[self.i] == ">":
            self.i += 1
            children = self.parse_jsx_children("")
            return f"React.createElement(React.Fragment, null{children})"

        m = re.match(r"^([A-Za-z_][A-Za-z0-9_.-]*)", self.code[self.i :])
        tag = m.group(1)
        self.i += len(tag)

        props_str = self.parse_jsx_props()
        self.skip_ws()

        if self.code.startswith("/>", self.i):
            self.i += 2
            tag_expr = f'"{tag}"' if tag[0].islower() else tag
            return f"React.createElement({tag_expr}, {props_str})"

        if self.i < self.n and self.code[self.i] == ">":
            self.i += 1
        children = self.parse_jsx_children(tag)
        tag_expr = f'"{tag}"' if tag[0].islower() else tag
        return f"React.createElement({tag_expr}, {props_str}{children})"

    def parse_jsx_props(self):
        props = []
        spreads = []
        while self.i < self.n:
            self.skip_ws()
            if self.code.startswith("/>", self.i) or (self.i < self.n and self.code[self.i] == ">"):
                break
            if self.code.startswith("{...", self.i):
                self.i += 4
                expr = self.parse_js(stop_chars={"}"})
                if self.i < self.n and self.code[self.i] == "}":
                    self.i += 1
                spreads.append(expr.strip())
                continue
            m = re.match(r"^([A-Za-z_][A-Za-z0-9_:-]*)", self.code[self.i :])
            if not m:
                self.i += 1
                continue
            attr_name = m.group(1)
            self.i += len(attr_name)
            self.skip_ws()
            if self.i < self.n and self.code[self.i] == "=":
                self.i += 1
                self.skip_ws()
                if self.i < self.n and self.code[self.i] in ("'", '"'):
                    val = self.read_string(self.code[self.i])
                elif self.i < self.n and self.code[self.i] == "{":
                    self.i += 1
                    val = self.parse_js(stop_chars={"}"}).strip()
                    if self.i < self.n and self.code[self.i] == "}":
                        self.i += 1
                else:
                    val = "true"
            else:
                val = "true"
            key_str = f'"{attr_name}"' if ("-" in attr_name or ":" in attr_name) else attr_name
            props.append(f"{key_str}: {val}")

        if not props and not spreads:
            return "null"
        if spreads and not props:
            return f"Object.assign({{}}, {', '.join(spreads)})"
        if spreads:
            return f"Object.assign({{{', '.join(props)}}}, {', '.join(spreads)})"
        return "{" + ", ".join(props) + "}"

    def parse_jsx_children(self, closing_tag):
        children = []
        close_seq = f"</{closing_tag}>"
        while self.i < self.n:
            if self.code.startswith(close_seq, self.i):
                self.i += len(close_seq)
                break
            if closing_tag == "" and self.code.startswith("</>", self.i):
                self.i += 3
                break

            if self.code.startswith("{/*", self.i):
                end = self.code.find("*/}", self.i + 3)
                self.i = end + 3 if end != -1 else self.n
                continue

            if self.code[self.i] == "{":
                self.i += 1
                expr = self.parse_js(stop_chars={"}"}).strip()
                if self.i < self.n and self.code[self.i] == "}":
                    self.i += 1
                if expr:
                    children.append(expr)
                continue

            if self.code[self.i] == "<" and not self.code.startswith("</", self.i):
                children.append(self.parse_jsx_element())
                continue

            if self.code.startswith("</", self.i):
                end = self.code.find(">", self.i)
                self.i = end + 1 if end != -1 else self.n
                break

            text_buf = []
            while self.i < self.n and self.code[self.i] not in ("<", "{"):
                text_buf.append(self.code[self.i])
                self.i += 1
            raw_text = "".join(text_buf)
            cleaned = self.clean_jsx_text(raw_text)
            if cleaned:
                escaped = (
                    cleaned.replace("\\", "\\\\")
                    .replace('"', '\\"')
                    .replace("\n", "\\n")
                    .replace("\r", "")
                )
                children.append(f'"{escaped}"')

        if not children:
            return ""
        return ", " + ", ".join(children)

    @staticmethod
    def clean_jsx_text(raw):
        raw = raw.replace("&nbsp;", "\u00a0").replace("&rarr;", "→").replace("&larr;", "←")
        if "\n" not in raw:
            return raw
        lines = raw.split("\n")
        cleaned_lines = []
        for idx, line in enumerate(lines):
            s = line
            if idx > 0:
                s = s.lstrip()
            if idx < len(lines) - 1:
                s = s.rstrip()
            if s:
                cleaned_lines.append(s)
        return " ".join(cleaned_lines)


OFFLINE_REACT_AND_SHIMS = r"""
// === Self-Contained Offline React 18 Compatible VDOM + In-Place Reconciler ===
// Memperbarui DOM secara in-place (tanpa pernah menghapus/me-remount elemen <input> yang sedang aktif)
(function() {
  if (window.React && window.ReactDOM) return;

  const Fragment = Symbol('Fragment');
  let currentComponent = null;
  let hookIndex = 0;
  let rootInstance = null;
  let rootContainer = null;
  let renderScheduled = false;
  let pendingEffects = [];
  let stateStore = new Map();

  function createElement(type, props, ...children) {
    const flatChildren = [];
    function flatten(arr) {
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i];
        if (Array.isArray(c)) flatten(c);
        else if (c !== null && c !== undefined && c !== false && c !== true) {
          flatChildren.push(c);
        }
      }
    }
    flatten(children);
    const finalProps = Object.assign({}, props || {});
    if (flatChildren.length === 1) finalProps.children = flatChildren[0];
    else if (flatChildren.length > 1) finalProps.children = flatChildren;
    return { type, props: finalProps };
  }

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    Promise.resolve().then(() => {
      renderScheduled = false;
      if (rootInstance && rootContainer) {
        rerenderRoot();
      }
    });
  }

  function getCompState(id) {
    if (!stateStore.has(id)) {
      stateStore.set(id, { hooks: [] });
    }
    return stateStore.get(id);
  }

  function useState(initialValue) {
    const comp = currentComponent;
    const idx = hookIndex++;
    const hooks = comp.hooks;
    if (idx >= hooks.length) {
      hooks[idx] = typeof initialValue === 'function' ? initialValue() : initialValue;
    }
    const setState = (updater) => {
      const nextVal = typeof updater === 'function' ? updater(hooks[idx]) : updater;
      if (nextVal !== hooks[idx]) {
        hooks[idx] = nextVal;
        scheduleRender();
      }
    };
    return [hooks[idx], setState];
  }

  function useRef(initialValue) {
    const comp = currentComponent;
    const idx = hookIndex++;
    const hooks = comp.hooks;
    if (idx >= hooks.length) {
      hooks[idx] = { current: initialValue };
    }
    return hooks[idx];
  }

  function depsChanged(oldDeps, newDeps) {
    if (!oldDeps || !newDeps) return true;
    if (oldDeps.length !== newDeps.length) return true;
    for (let i = 0; i < oldDeps.length; i++) {
      if (oldDeps[i] !== newDeps[i]) return true;
    }
    return false;
  }

  function useMemo(factory, deps) {
    const comp = currentComponent;
    const idx = hookIndex++;
    const hooks = comp.hooks;
    if (idx >= hooks.length || depsChanged(hooks[idx].deps, deps)) {
      hooks[idx] = { val: factory(), deps };
    }
    return hooks[idx].val;
  }

  function useCallback(fn, deps) {
    return useMemo(() => fn, deps);
  }

  function useEffect(effect, deps) {
    const comp = currentComponent;
    const idx = hookIndex++;
    const hooks = comp.hooks;
    if (idx >= hooks.length || depsChanged(hooks[idx].deps, deps)) {
      const prevCleanup = idx < hooks.length ? hooks[idx].cleanup : null;
      const record = { deps, cleanup: prevCleanup };
      hooks[idx] = record;
      pendingEffects.push(() => {
        if (typeof record.cleanup === 'function') {
          try { record.cleanup(); } catch (e) {}
        }
        record.cleanup = effect() || null;
      });
    }
  }

  function createContext(defaultValue) {
    const ctx = { _currentValue: defaultValue };
    ctx.Provider = function Provider({ value, children }) {
      ctx._currentValue = value;
      return children;
    };
    return ctx;
  }

  function useContext(ctx) {
    return ctx._currentValue;
  }

  const SVG_TAGS = new Set([
    'svg', 'defs', 'filter', 'feDropShadow', 'g', 'text', 'path', 'circle',
    'ellipse', 'rect', 'line', 'polygon', 'polyline', 'linearGradient',
    'radialGradient', 'stop'
  ]);

  const SVG_CAMEL_ATTRS = new Set([
    'viewBox', 'preserveAspectRatio', 'stdDeviation', 'gradientTransform',
    'floodColor', 'floodOpacity', 'stopColor', 'stopOpacity', 'strokeWidth',
    'strokeLinecap', 'strokeLinejoin', 'strokeDasharray', 'paintOrder',
    'textAnchor', 'fontFamily', 'fontWeight', 'fontSize', 'letterSpacing'
  ]);

  // Expand functional components & fragments into normalized host VNode list
  function expandVNodes(vnode, pathId, isSvg = false) {
    if (vnode === null || vnode === undefined || typeof vnode === 'boolean') {
      return [];
    }
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return [{ kind: 'text', text: String(vnode) }];
    }
    if (Array.isArray(vnode)) {
      const res = [];
      for (let i = 0; i < vnode.length; i++) {
        res.push(...expandVNodes(vnode[i], `${pathId}.${i}`, isSvg));
      }
      return res;
    }
    if (vnode.type === Fragment) {
      const ch = vnode.props?.children;
      const arr = Array.isArray(ch) ? ch : (ch !== undefined ? [ch] : []);
      const res = [];
      for (let i = 0; i < arr.length; i++) {
        res.push(...expandVNodes(arr[i], `${pathId}.f${i}`, isSvg));
      }
      return res;
    }
    if (typeof vnode.type === 'function') {
      const compName = vnode.type.name || 'Anon';
      const keyPart = vnode.props && vnode.props.key !== undefined ? `:${vnode.props.key}` : '';
      const compId = `${pathId}/${compName}${keyPart}`;
      const prevComp = currentComponent;
      const prevHookIdx = hookIndex;
      currentComponent = getCompState(compId);
      hookIndex = 0;
      let rendered = null;
      try {
        rendered = vnode.type(vnode.props || {});
      } finally {
        currentComponent = prevComp;
        hookIndex = prevHookIdx;
      }
      return expandVNodes(rendered, compId, isSvg);
    }

    const tag = String(vnode.type);
    const nextIsSvg = isSvg || tag === 'svg' || SVG_TAGS.has(tag);
    const props = vnode.props || {};
    const ch = props.children;
    const arr = Array.isArray(ch) ? ch : (ch !== undefined ? [ch] : []);
    const expandedChildren = [];
    for (let i = 0; i < arr.length; i++) {
      expandedChildren.push(...expandVNodes(arr[i], `${pathId}.${i}`, nextIsSvg));
    }

    return [{
      kind: 'element',
      tag,
      isSvg: nextIsSvg,
      props,
      key: props.key !== undefined ? String(props.key) : null,
      children: expandedChildren,
    }];
  }

  function applyDomProps(el, oldProps, newProps, isSvg, tag) {
    el._handlers = el._handlers || {};
    el._bound = el._bound || {};

    // Remove old attributes/handlers not in newProps
    Object.keys(oldProps).forEach((k) => {
      if (k === 'children' || k === 'key' || k === 'ref') return;
      if (!(k in newProps) || newProps[k] === undefined || newProps[k] === null || newProps[k] === false) {
        if (k.startsWith('on')) {
          const evt = k.slice(2).toLowerCase();
          delete el._handlers[evt];
        } else if (k === 'className') {
          if (isSvg) el.removeAttribute('class');
          else el.className = '';
        if (k === 'checked') {
          el.checked = Boolean(val);
          return;
        } else if (k === 'disabled') {
          el.disabled = false;
          el.removeAttribute('disabled');
        } else if (k !== 'value') {
          const attrName = SVG_CAMEL_ATTRS.has(k) ? k : k.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase());
          el.removeAttribute(attrName);
        }
      }
    });

    // Apply new or updated props in-place
    Object.keys(newProps).forEach((k) => {
      if (k === 'children' || k === 'key') return;
      const val = newProps[k];
      if (val === undefined || val === null || val === false) return;

      if (k === 'ref' && typeof val === 'object') {
        val.current = el;
        return;
      }
      if (k === 'className') {
        if (oldProps.className !== val) {
          if (isSvg) el.setAttribute('class', val);
          else el.className = val;
        }
        return;
      }
      if (k === 'htmlFor') {
        el.setAttribute('for', val);
        return;
      }
      if (k === 'style' && typeof val === 'object') {
        el.removeAttribute('style');
        Object.assign(el.style, val);
        return;
      }
      if (k.startsWith('on') && typeof val === 'function') {
        const rawEvt = k.slice(2).toLowerCase();
        const isFileOrSelectOrCheckbox =
          tag === 'select' ||
          (tag === 'input' &&
            (newProps.type === 'file' ||
              el.type === 'file' ||
              newProps.type === 'checkbox' ||
              el.type === 'checkbox'));
        const evt = rawEvt === 'change' && (tag === 'input' || tag === 'textarea') && !isFileOrSelectOrCheckbox ? 'input' : rawEvt;
        el._handlers[evt] = val;
        if (!el._bound[evt]) {
          el._bound[evt] = (e) => {
            if (typeof el._handlers[evt] === 'function') {
              el._handlers[evt](e);
            }
          };
          el.addEventListener(evt, el._bound[evt]);
        }
        return;
      }
      if (k === 'value') {
        const strVal = String(val);
        if (el.value !== strVal) {
          el.value = strVal;
        }
        return;
      }
      if (k === 'checked') {
        el.checked = Boolean(val);
        return;
      }
      if (k === 'disabled') {
        el.disabled = Boolean(val);
        if (val) el.setAttribute('disabled', '');
        else el.removeAttribute('disabled');
        return;
      }

      if (oldProps[k] !== val) {
        const exactCamel = new Set(['viewBox', 'preserveAspectRatio', 'stdDeviation', 'gradientTransform']);
        let attrName = k;
        if (!exactCamel.has(k)) {
          if (isSvg) {
            attrName = k.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase());
          } else {
            attrName = k.toLowerCase();
          }
        }
        el.setAttribute(attrName, val === true ? (attrName === 'draggable' ? 'true' : '') : String(val));
      }
    });

    el._vprops = newProps;
  }

  function createDomNode(hostNode) {
    if (hostNode.kind === 'text') {
      return document.createTextNode(hostNode.text);
    }
    const el = hostNode.isSvg
      ? document.createElementNS('http://www.w3.org/2000/svg', hostNode.tag)
      : document.createElement(hostNode.tag);
    el._vtag = hostNode.tag;
    el._vkey = hostNode.key;
    applyDomProps(el, {}, hostNode.props, hostNode.isSvg, hostNode.tag);
    for (let i = 0; i < hostNode.children.length; i++) {
      el.appendChild(createDomNode(hostNode.children[i]));
    }
    return el;
  }

  function reconcileChildren(parentDom, newHostNodes) {
    const existingNodes = Array.from(parentDom.childNodes);

    for (let i = 0; i < newHostNodes.length; i++) {
      const newNode = newHostNodes[i];
      const oldDom = parentDom.childNodes[i];

      if (!oldDom) {
        parentDom.appendChild(createDomNode(newNode));
        continue;
      }

      if (newNode.kind === 'text') {
        if (oldDom.nodeType === 3) {
          if (oldDom.nodeValue !== newNode.text) {
            oldDom.nodeValue = newNode.text;
          }
        } else {
          parentDom.replaceChild(createDomNode(newNode), oldDom);
        }
        continue;
      }

      // Element node: check if same tag & key so we update in-place without remounting!
      const sameTag = oldDom.nodeType === 1 && oldDom._vtag === newNode.tag;
      const sameKey = (oldDom._vkey || null) === (newNode.key || null);

      if (sameTag && sameKey) {
        applyDomProps(oldDom, oldDom._vprops || {}, newNode.props, newNode.isSvg, newNode.tag);
        reconcileChildren(oldDom, newNode.children);
      } else {
        parentDom.replaceChild(createDomNode(newNode), oldDom);
      }
    }

    while (parentDom.childNodes.length > newHostNodes.length) {
      parentDom.removeChild(parentDom.lastChild);
    }
  }

  function rerenderRoot() {
    if (!rootContainer || !rootInstance) return;
    const effectsToRun = [];
    pendingEffects = effectsToRun;
    const newHostNodes = expandVNodes(rootInstance, 'root', false);
    reconcileChildren(rootContainer, newHostNodes);
    const runNow = pendingEffects.slice();
    pendingEffects = [];
    runNow.forEach((fn) => {
      try { fn(); } catch (e) { console.error(e); }
    });
  }

  window.React = {
    createElement,
    Fragment,
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    createContext,
    useContext,
    isValidElement: (el) => el && typeof el === 'object' && 'type' in el,
    Children: {
      toArray: (ch) => (Array.isArray(ch) ? ch.flat() : ch ? [ch] : []),
    },
  };

  window.ReactDOM = {
    createRoot: (container) => ({
      render: (element) => {
        rootContainer = container;
        rootInstance = element;
        rerenderRoot();
      },
    }),
  };
})();

const { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } = React;

// === Lightweight Self-Contained React Router v6 Runtime ===
const RouterCtx = createContext({ pathname: '/beranda', navigate: () => {} });
const ParamsCtx = createContext({});

function getInitialPath() {
  if (window.location.protocol === 'file:') {
    const h = window.location.hash.replace(/^#/, '');
    return h || '/beranda';
  }
  const h = window.location.hash.replace(/^#/, '');
  if (h && h.startsWith('/')) return h;
  return window.location.pathname || '/';
}

function BrowserRouter({ children }) {
  const [pathname, setPathname] = useState(getInitialPath);
  const [historyStack, setHistoryStack] = useState([getInitialPath()]);

  useEffect(() => {
    const onPop = () => {
      setPathname(getInitialPath());
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const navigate = useCallback((to, options = {}) => {
    if (typeof to === 'number') {
      setHistoryStack((prev) => {
        if (prev.length > 1) {
          const nextStack = prev.slice(0, -1);
          const target = nextStack[nextStack.length - 1] || '/beranda';
          if (window.location.protocol === 'file:') window.location.hash = target;
          else window.history.pushState({}, '', target);
          setPathname(target);
          return nextStack;
        }
        setPathname('/beranda');
        return ['/beranda'];
      });
      return;
    }
    const target = to || '/';
    if (window.location.protocol === 'file:') {
      window.location.hash = target;
    } else if (options.replace) {
      window.history.replaceState({}, '', target);
    } else {
      window.history.pushState({}, '', target);
    }
    setPathname(target);
    setHistoryStack((prev) => (options.replace ? [...prev.slice(0, -1), target] : [...prev, target]));
  }, []);

  return React.createElement(RouterCtx.Provider, { value: { pathname, navigate } }, children);
}

const HashRouter = BrowserRouter;
const RouterComponent = BrowserRouter;

function useNavigate() {
  return useContext(RouterCtx).navigate;
}

function useLocation() {
  const { pathname } = useContext(RouterCtx);
  return { pathname };
}

function useParams() {
  return useContext(ParamsCtx);
}

function matchRoute(pattern, pathname) {
  if (pattern === '*') return { matched: true, params: {} };
  const cleanPattern = pattern.replace(/\/+$/, '') || '/';
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  const pParts = cleanPattern.split('/');
  const uParts = cleanPath.split('/');
  if (pParts.length !== uParts.length) return { matched: false, params: {} };
  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) {
      params[pParts[i].slice(1)] = decodeURIComponent(uParts[i]);
    } else if (pParts[i] !== uParts[i]) {
      return { matched: false, params: {} };
    }
  }
  return { matched: true, params };
}

function Routes({ children }) {
  const { pathname } = useContext(RouterCtx);
  const childArray = React.Children.toArray(children);
  for (let i = 0; i < childArray.length; i++) {
    const child = childArray[i];
    if (!child || !child.props) continue;
    const { path, element } = child.props;
    const res = matchRoute(path || '*', pathname);
    if (res.matched) {
      return React.createElement(ParamsCtx.Provider, { value: res.params }, element);
    }
  }
  return null;
}

function Route() { return null; }

function Navigate({ to, replace }) {
  const navigate = useNavigate();
  useEffect(() => { navigate(to, { replace }); }, [to, replace, navigate]);
  return null;
}

function Link({ to, children, onClick, className = '', ...rest }) {
  const navigate = useNavigate();
  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented) {
      e.preventDefault();
      navigate(to);
    }
  };
  return React.createElement('a', Object.assign({ href: to, onClick: handleClick, className }, rest), children);
}

function NavLink({ to, children, className, ...rest }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
  const resolvedClass = typeof className === 'function' ? className({ isActive }) : className;
  const resolvedChildren = typeof children === 'function' ? children({ isActive }) : children;
  return React.createElement(
    'a',
    Object.assign({
      href: to,
      onClick: (e) => { e.preventDefault(); navigate(to); },
      className: resolvedClass
    }, rest),
    resolvedChildren
  );
}
"""

ICONS_JSX = r"""
function createIcon(paths) {
  return function IconComponent({ className = 'w-5 h-5', ...rest }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}

const Search = createIcon(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>);
const MoreVertical = createIcon(<><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></>);
const Info = createIcon(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>);
const BookOpen = createIcon(<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>);
const Heart = createIcon(<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />);
const User = createIcon(<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>);
const LogOut = createIcon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>);
const Sparkles = createIcon(<><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /></>);
const Home = createIcon(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>);
const BookMarked = createIcon(<><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /><polyline points="10 2 10 10 13 7 16 10 16 2" /></>);
const LogIn = createIcon(<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></>);
const UserPlus = createIcon(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></>);
const ArrowLeft = createIcon(<><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>);
const Mail = createIcon(<><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>);
const Lock = createIcon(<><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>);
const AlertCircle = createIcon(<><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>);
const Eye = createIcon(<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>);
const EyeOff = createIcon(<><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></>);
const RotateCcw = createIcon(<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>);
const BookmarkCheck = createIcon(<><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" /><path d="m9 10 2 2 4-4" /></>);
const List = createIcon(<><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></>);
const Clock = createIcon(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>);
const Play = createIcon(<polygon points="6 3 20 12 6 21 6 3" />);
const CheckCircle2 = createIcon(<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>);
const ChevronLeft = createIcon(<path d="m15 18-6-6 6-6" />);
const ChevronRight = createIcon(<path d="m9 18 6-6-6-6" />);
const Bookmark = createIcon(<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />);
const Menu = createIcon(<><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></>);
const CheckCircle = createIcon(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>);
const Type = createIcon(<><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" /></>);
const Share2 = createIcon(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></>);
const Award = createIcon(<><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></>);
const Smartphone = createIcon(<><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></>);
const ShieldCheck = createIcon(<><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>);
const XCircle = createIcon(<><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>);
const Plus = createIcon(<><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></>);
const Trash2 = createIcon(<><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></>);
const Copy = createIcon(<><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>);
const ArrowUp = createIcon(<><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></>);
const ArrowDown = createIcon(<><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>);
const GripVertical = createIcon(<><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></>);
const Upload = createIcon(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></>);
const Camera = createIcon(<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>);
const Crop = createIcon(<><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></>);
const RotateCw = createIcon(<><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></>);
const Check = createIcon(<polyline points="20 6 9 17 4 12" />);
const Save = createIcon(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>);
const Send = createIcon(<><line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>);
const Edit3 = createIcon(<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>);
const Download = createIcon(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>);
const FileUp = createIcon(<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M12 12v6" /><path d="m15 15-3-3-3 3" /></>);
const Star = createIcon(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />);
const Volume2 = createIcon(<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>);
const VolumeX = createIcon(<><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="22" x2="16" y1="9" y2="15" /><line x1="16" x2="22" y1="9" y2="15" /></>);
const X = createIcon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
const ArrowRight = createIcon(<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>);
const RefreshCw = createIcon(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>);
const ImageIcon = createIcon(<><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></>);
const ListOrdered = createIcon(<><line x1="10" x2="21" y1="6" y2="6" /><line x1="10" x2="21" y1="12" y2="12" /><line x1="10" x2="21" y1="18" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></>);
"""

OFFLINE_TAILWIND_CSS = r"""
*, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; border-color: rgba(255,255,255,0.2); }
html, body { margin: 0; padding: 0; background-color: #007A78; color: #FFFFFF; font-family: var(--font-heading); font-weight: 500; line-height: 1.55; -webkit-font-smoothing: antialiased; overflow-x: hidden; max-width: 100vw; }
h1, h2, h3, h4, .font-heading { font-family: var(--font-heading); margin: 0; }
p { margin: 0; }
a { color: inherit; text-decoration: none; }
button, input, textarea { font-family: inherit; color: inherit; background: none; border: none; padding: 0; margin: 0; }
textarea { resize: vertical; outline: none; }
input::placeholder, textarea::placeholder { color: #64748B; opacity: 1; }

/* Layout & Sizing */
.block { display: block; }
.inline-block { display: inline-block; }
.inline { display: inline; }
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.grid > * { min-width: 0; }
.hidden { display: none; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.flex-wrap { flex-wrap: wrap; }
.flex-1 { flex: 1 1 0%; }
.shrink-0 { flex-shrink: 0; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-stretch { align-items: stretch; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.self-start { align-self: flex-start; }
.self-end { align-self: flex-end; }

.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
.col-span-5 { grid-column: span 5 / span 5; }
.col-span-7 { grid-column: span 7 / span 7; }

.w-full { width: 100%; }
.w-auto { width: auto; }
.h-full { height: 100%; }
.h-auto { height: auto; }
.min-h-screen { min-height: 100vh; }
.min-w-0 { min-width: 0px; }
.max-w-xs { max-width: 20rem; }
.max-w-sm { max-width: 24rem; }
.max-w-md { max-width: 28rem; }
.max-w-lg { max-width: 32rem; }
.max-w-xl { max-width: 36rem; }
.max-w-2xl { max-width: 42rem; }
.max-w-\[1200px\] { max-width: 1200px; }
.max-w-\[1160px\] { max-width: 1160px; }
.max-w-\[1100px\] { max-width: 1100px; }
.max-w-\[1000px\] { max-width: 1000px; }
.max-w-\[960px\] { max-width: 960px; }
.max-w-\[920px\] { max-width: 920px; }
.max-w-\[840px\] { max-width: 840px; }
.max-w-\[820px\] { max-width: 820px; }
.max-w-\[760px\] { max-width: 760px; }
.max-w-\[720px\] { max-width: 720px; }
.max-w-\[340px\] { max-width: 340px; }
.max-w-\[320px\] { max-width: 320px; }
.max-w-\[290px\] { max-width: 290px; }
.max-w-\[240px\] { max-width: 240px; }
.max-w-\[210px\] { max-width: 210px; }
.max-w-\[170px\] { max-width: 170px; }
.max-w-\[160px\] { max-width: 160px; }
.max-w-\[110px\] { max-width: 110px; }
.max-w-\[75\%\] { max-width: 75%; }
.max-w-\[60\%\] { max-width: 60%; }
.max-h-\[440px\] { max-height: 440px; }
.min-h-\[540px\] { min-height: 540px; }
.min-h-\[290px\] { min-height: 290px; }
.min-h-\[270px\] { min-height: 270px; }
.min-h-\[128px\] { min-height: 128px; }
.min-h-\[124px\] { min-height: 124px; }
.min-h-\[104px\] { min-height: 104px; }
.min-h-\[96px\] { min-height: 96px; }
.min-h-\[72px\] { min-height: 72px; }
.min-h-\[68px\] { min-height: 68px; }
.min-h-\[60px\] { min-height: 60px; }
.min-h-\[56px\] { min-height: 56px; }
.min-h-\[54px\] { min-height: 54px; }
.min-h-\[52px\] { min-height: 52px; }
.min-h-\[50px\] { min-height: 50px; }
.min-h-\[48px\] { min-height: 48px; }
.min-h-\[46px\] { min-height: 46px; }
.min-h-\[44px\] { min-height: 44px; }
.min-h-\[42px\] { min-height: 42px; }
.min-h-\[40px\] { min-height: 40px; }
.min-h-\[38px\] { min-height: 38px; }
.min-h-\[36px\] { min-height: 36px; }
.min-w-\[260px\] { min-width: 260px; }
.min-w-\[160px\] { min-width: 160px; }
.min-w-\[96px\] { min-width: 96px; }
.min-w-\[44px\] { min-width: 44px; }
.min-w-\[36px\] { min-width: 36px; }

.w-2\.5 { width: 0.625rem; } .h-2\.5 { height: 0.625rem; }
.w-3 { width: 0.75rem; } .h-3 { height: 0.75rem; }
.w-3\.5 { width: 0.875rem; } .h-3\.5 { height: 0.875rem; }
.w-4 { width: 1rem; } .h-4 { height: 1rem; }
.w-5 { width: 1.25rem; } .h-5 { height: 1.25rem; }
.w-6 { width: 1.5rem; } .h-6 { height: 1.5rem; }
.w-7 { width: 1.75rem; } .h-7 { height: 1.75rem; }
.w-8 { width: 2rem; } .h-8 { height: 2rem; }
.w-9 { width: 2.25rem; } .h-9 { height: 2.25rem; }
.w-10 { width: 2.5rem; } .h-10 { height: 2.5rem; }
.w-11 { width: 2.75rem; } .h-11 { height: 2.75rem; }
.w-12 { width: 3rem; } .h-12 { height: 3rem; }
.w-14 { width: 3.5rem; } .h-14 { height: 3.5rem; }
.w-16 { width: 4rem; } .h-16 { height: 4rem; }
.w-20 { width: 5rem; } .h-20 { height: 5rem; }
.w-24 { width: 6rem; } .h-24 { height: 6rem; }
.w-28 { width: 7rem; } .h-28 { height: 7rem; }
.w-32 { width: 8rem; } .h-32 { height: 8rem; }
.w-34 { width: 8.5rem; } .h-34 { height: 8.5rem; }
.w-36 { width: 9rem; } .h-36 { height: 9rem; }
.w-40 { width: 10rem; } .h-40 { height: 10rem; }
.w-48 { width: 12rem; }
.w-52 { width: 13rem; } .h-52 { height: 13rem; }
.w-56 { width: 14rem; }
.w-60 { width: 15rem; }
.w-72 { width: 18rem; } .h-72 { height: 18rem; }
.h-2 { height: 0.5rem; }

.aspect-square { aspect-ratio: 1 / 1; }
.aspect-\[4\/4\.3\] { aspect-ratio: 4 / 4.3; }
.aspect-\[4\/4\.2\] { aspect-ratio: 4 / 4.2; }
.aspect-\[4\/3\.6\] { aspect-ratio: 4 / 3.6; }
.aspect-\[4\/3\.3\] { aspect-ratio: 4 / 3.3; }
.aspect-\[4\/3\.2\] { aspect-ratio: 4 / 3.2; }
.aspect-\[4\/3\] { aspect-ratio: 4 / 3; }

/* Positioning */
.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.sticky { position: sticky; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.top-0 { top: 0; } .bottom-0 { bottom: 0; } .left-0 { left: 0; } .right-0 { right: 0; }
.top-2 { top: 0.5rem; } .left-2 { left: 0.5rem; } .right-2 { right: 0.5rem; }
.top-3 { top: 0.75rem; } .left-3 { left: 0.75rem; } .right-3 { right: 0.75rem; }
.top-3\.5 { top: 0.875rem; } .left-3\.5 { left: 0.875rem; } .right-3\.5 { right: 0.875rem; }
.top-4 { top: 1rem; } .right-4 { right: 1rem; } .left-4 { left: 1rem; }
.bottom-2 { bottom: 0.5rem; }
.bottom-3 { bottom: 0.75rem; }
.top-1\/2 { top: 50%; } .left-1\/2 { left: 50%; }
.-translate-y-1\/2 { transform: translateY(-50%); }
.-translate-x-1\/2 { transform: translateX(-50%); }
.z-10 { z-index: 10; } .z-20 { z-index: 20; } .z-30 { z-index: 30; } .z-50 { z-index: 50; }

/* Gaps & Spacing */
.gap-1 { gap: 0.25rem; }
.gap-1\.5 { gap: 0.375rem; }
.gap-2 { gap: 0.5rem; }
.gap-2\.5 { gap: 0.625rem; }
.gap-3 { gap: 0.75rem; }
.gap-3\.5 { gap: 0.875rem; }
.gap-4 { gap: 1rem; }
.gap-5 { gap: 1.25rem; }
.gap-6 { gap: 1.5rem; }
.space-y-2\.5 > * + * { margin-top: 0.625rem; }
.space-y-3 > * + * { margin-top: 0.75rem; }
.space-y-4 > * + * { margin-top: 1rem; }
.space-y-5 > * + * { margin-top: 1.25rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }
.ring-2 { box-shadow: 0 0 0 2px #FFE9B0; }
.bg-\[\#004A48\]\/80 { background-color: rgba(0, 74, 72, 0.80); }
.rounded-\[30px\] { border-radius: 30px; }
.border-\[\#FFE9B0\]\/70 { border-color: rgba(255, 233, 176, 0.70); }
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
.divide-y-2 > * + * { border-top-width: 2px; border-color: rgba(255,255,255,0.5); }

.mx-auto { margin-left: auto; margin-right: auto; }
.my-4 { margin-top: 1rem; margin-bottom: 1rem; }
.my-8 { margin-top: 2rem; margin-bottom: 2rem; }
.-ml-4 { margin-left: -1rem; }
.mt-0\.5 { margin-top: 0.125rem; }
.mt-1 { margin-top: 0.25rem; }
.mt-1\.5 { margin-top: 0.375rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-2\.5 { margin-top: 0.625rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mt-5 { margin-top: 1.25rem; }
.mt-6 { margin-top: 1.5rem; }
.mt-7 { margin-top: 1.75rem; }
.mt-8 { margin-top: 2rem; }
.mb-0\.5 { margin-bottom: 0.125rem; }
.mb-1\.5 { margin-bottom: 0.375rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-5 { margin-bottom: 1.25rem; }
.mb-6 { margin-bottom: 1.5rem; }

.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-2\.5 { padding: 0.625rem; }
.p-3 { padding: 0.75rem; }
.p-3\.5 { padding: 0.875rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.p-6 { padding: 1.5rem; }
.p-7 { padding: 1.75rem; }
.p-8 { padding: 2rem; }
.pb-3\.5 { padding-bottom: 0.875rem; }
.pb-6 { padding-bottom: 1.5rem; }
.pb-7 { padding-bottom: 1.75rem; }
.pb-8 { padding-bottom: 2rem; }
.pb-10 { padding-bottom: 2.5rem; }
.pb-24 { padding-bottom: 6rem; }
.pt-1 { padding-top: 0.25rem; }
.pt-1\.5 { padding-top: 0.375rem; }
.pt-2 { padding-top: 0.5rem; }
.pt-3 { padding-top: 0.75rem; }
.pt-3\.5 { padding-top: 0.875rem; }
.pt-4 { padding-top: 1rem; }
.pt-5 { padding-top: 1.25rem; }
.pt-6 { padding-top: 1.5rem; }
.px-1\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-2\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-3\.5 { padding-left: 0.875rem; padding-right: 0.875rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.px-7 { padding-left: 1.75rem; padding-right: 1.75rem; }
.px-8 { padding-left: 2rem; padding-right: 2rem; }
.py-0\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-1\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-2\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.py-3\.5 { padding-top: 0.875rem; padding-bottom: 0.875rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
.pl-1 { padding-left: 0.25rem; }
.pl-2 { padding-left: 0.5rem; }
.pl-5 { padding-left: 1.25rem; }
.pl-12 { padding-left: 3rem; }
.pr-4 { padding-right: 1rem; }
.pr-5 { padding-right: 1.25rem; }
.pr-12 { padding-right: 3rem; }

/* Colors & Backgrounds (File 2 Palette) */
.bg-\[\#007A78\] { background-color: #007A78; }
.bg-\[\#007A78\]\/95 { background-color: rgba(0, 122, 120, 0.95); }
.bg-\[\#007A78\]\/90 { background-color: rgba(0, 122, 120, 0.90); }
.bg-\[\#007A78\]\/85 { background-color: rgba(0, 122, 120, 0.85); }
.bg-\[\#007A78\]\/35 { background-color: rgba(0, 122, 120, 0.35); }
.bg-\[\#005E5C\] { background-color: #005E5C; }
.bg-\[\#005E5C\]\/95 { background-color: rgba(0, 94, 92, 0.95); }
.bg-\[\#005E5C\]\/90 { background-color: rgba(0, 94, 92, 0.90); }
.bg-\[\#005E5C\]\/85 { background-color: rgba(0, 94, 92, 0.85); }
.bg-\[\#005E5C\]\/80 { background-color: rgba(0, 94, 92, 0.80); }
.bg-\[\#005E5C\]\/75 { background-color: rgba(0, 94, 92, 0.75); }
.bg-\[\#004A48\] { background-color: #004A48; }
.bg-\[\#004E4D\]\/90 { background-color: rgba(0, 78, 77, 0.90); }
.bg-\[\#1FAFAA\] { background-color: #1FAFAA; }
.bg-\[\#1FAFAA\]\/35 { background-color: rgba(31, 175, 170, 0.35); }
.bg-\[\#1FAFAA\]\/25 { background-color: rgba(31, 175, 170, 0.25); }
.bg-\[\#1FAFAA\]\/20 { background-color: rgba(31, 175, 170, 0.20); }
.bg-\[\#159A95\] { background-color: #159A95; }
.bg-\[\#E07030\] { background-color: #E07030; }
.bg-\[\#E07030\]\/90 { background-color: rgba(224, 112, 48, 0.90); }
.bg-\[\#E07030\]\/20 { background-color: rgba(224, 112, 48, 0.20); }
.bg-\[\#FFE9B0\] { background-color: #FFE9B0; }
.bg-\[\#FFE9B0\]\/15 { background-color: rgba(255, 233, 176, 0.15); }
.bg-\[\#062D2C\] { background-color: #062D2C; }
.bg-\[\#062D2C\]\/90 { background-color: rgba(6, 45, 44, 0.90); }
.bg-\[\#062D2C\]\/85 { background-color: rgba(6, 45, 44, 0.85); }
.bg-\[\#062D2C\]\/80 { background-color: rgba(6, 45, 44, 0.80); }
.bg-\[\#062D2C\]\/75 { background-color: rgba(6, 45, 44, 0.75); }
.bg-\[\#062D2C\]\/70 { background-color: rgba(6, 45, 44, 0.70); }
.bg-\[\#062D2C\]\/60 { background-color: rgba(6, 45, 44, 0.60); }
.bg-\[\#062D2C\]\/50 { background-color: rgba(6, 45, 44, 0.50); }
.bg-\[\#062D2C\]\/15 { background-color: rgba(6, 45, 44, 0.15); }
.bg-\[\#D8CFC4\] { background-color: #D8CFC4; }
.bg-white { background-color: #FFFFFF; }
.bg-white\/85 { background-color: rgba(255, 255, 255, 0.85); }
.bg-white\/60 { background-color: rgba(255, 255, 255, 0.60); }
.bg-white\/50 { background-color: rgba(255, 255, 255, 0.50); }
.bg-white\/20 { background-color: rgba(255, 255, 255, 0.20); }
.bg-white\/15 { background-color: rgba(255, 255, 255, 0.15); }
.bg-white\/10 { background-color: rgba(255, 255, 255, 0.10); }
.bg-black\/75 { background-color: rgba(0, 0, 0, 0.75); }
.bg-black\/45 { background-color: rgba(0, 0, 0, 0.45); }
.bg-black\/35 { background-color: rgba(0, 0, 0, 0.35); }
.bg-black\/25 { background-color: rgba(0, 0, 0, 0.25); }
.bg-black\/20 { background-color: rgba(0, 0, 0, 0.20); }
.bg-black\/15 { background-color: rgba(0, 0, 0, 0.15); }
.bg-black\/10 { background-color: rgba(0, 0, 0, 0.10); }
.bg-red-500\/20 { background-color: rgba(239, 68, 68, 0.20); }
.bg-gradient-to-r { background-image: linear-gradient(to right, #005E5C, rgba(31, 175, 170, 0.4), #005E5C); }

.text-white { color: #FFFFFF; }
.text-white\/95 { color: rgba(255, 255, 255, 0.95); }
.text-white\/90 { color: rgba(255, 255, 255, 0.90); }
.text-white\/85 { color: rgba(255, 255, 255, 0.85); }
.text-white\/80 { color: rgba(255, 255, 255, 0.80); }
.text-white\/75 { color: rgba(255, 255, 255, 0.75); }
.text-white\/40 { color: rgba(255, 255, 255, 0.40); }
.text-\[\#FFE9B0\] { color: #FFE9B0; }
.text-\[\#1FAFAA\] { color: #1FAFAA; }
.text-\[\#E07030\] { color: #E07030; }
.text-\[\#062D2C\] { color: #062D2C; }
.text-\[\#062D2C\]\/65 { color: rgba(6, 45, 44, 0.65); }
.text-\[\#052625\] { color: #052625; }
.text-\[\#052625\]\/75 { color: rgba(5, 38, 37, 0.75); }
.text-\[\#042423\] { color: #042423; }
.text-slate-600 { color: #475569; }
.text-red-300 { color: #FCA5A5; }
.fill-\[\#FFE9B0\] { fill: #FFE9B0; }
.fill-\[\#052625\] { fill: #052625; }
.fill-white { fill: #FFFFFF; }

/* Borders & Rounded Corners */
.rounded-full { border-radius: 9999px; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-2xl { border-radius: 1rem; }
.rounded-3xl { border-radius: 1.5rem; }
.rounded-\[16px\] { border-radius: 16px; }
.rounded-\[18px\] { border-radius: 18px; }
.rounded-\[22px\] { border-radius: 22px; }
.rounded-\[24px\] { border-radius: 24px; }
.rounded-\[26px\] { border-radius: 26px; }
.rounded-\[28px\] { border-radius: 28px; }
.rounded-\[30px\] { border-radius: 30px; }
.rounded-\[32px\] { border-radius: 32px; }
.rounded-\[34px\] { border-radius: 34px; }
.rounded-t-\[24px\] { border-top-left-radius: 24px; border-top-right-radius: 24px; }
.rounded-t-\[34px\] { border-top-left-radius: 34px; border-top-right-radius: 34px; }

.border { border-width: 1px; }
.border-2 { border-width: 2px; }
.border-4 { border-width: 4px; }
.border-t { border-top-width: 1px; }
.border-t-2 { border-top-width: 2px; }
.border-b { border-bottom-width: 1px; }
.border-b-2 { border-bottom-width: 2px; }
.border-transparent { border-color: transparent; }
.border-\[\#1FAFAA\] { border-color: #1FAFAA; }
.border-\[\#1FAFAA\]\/60 { border-color: rgba(31, 175, 170, 0.6); }
.border-\[\#1FAFAA\]\/50 { border-color: rgba(31, 175, 170, 0.5); }
.border-\[\#1FAFAA\]\/40 { border-color: rgba(31, 175, 170, 0.4); }
.border-\[\#25C4BE\]\/50 { border-color: rgba(37, 196, 190, 0.5); }
.border-\[\#FFE9B0\] { border-color: #FFE9B0; }
.border-\[\#FFE9B0\]\/60 { border-color: rgba(255, 233, 176, 0.6); }
.border-\[\#E07030\] { border-color: #E07030; }
.focus\:border-\[\#E07030\]:focus { border-color: #E07030; }
.border-white\/60 { border-color: rgba(255, 255, 255, 0.6); }
.border-white\/25 { border-color: rgba(255, 255, 255, 0.25); }
.border-white\/20 { border-color: rgba(255, 255, 255, 0.20); }
.border-white\/15 { border-color: rgba(255, 255, 255, 0.15); }
.border-white\/10 { border-color: rgba(255, 255, 255, 0.10); }
.border-red-300 { border-color: #FCA5A5; }
.border-red-400 { border-color: #F87171; }

/* Shadows */
.shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
.shadow-md { box-shadow: 0 4px 10px rgba(0,30,29,0.22); }
.shadow-lg { box-shadow: 0 8px 18px rgba(0,30,29,0.28); }
.shadow-xl { box-shadow: 0 12px 24px rgba(0,30,29,0.32); }
.shadow-2xl { box-shadow: 0 18px 36px rgba(0,25,24,0.38); }
.shadow-inner { box-shadow: inset 0 2px 5px rgba(0,0,0,0.18); }
.shadow-\[0_6px_16px_rgba\(0\,45\,44\,0\.28\)\] { box-shadow: 0 6px 16px rgba(0,45,44,0.28); }
.shadow-\[0_-6px_24px_rgba\(0\,40\,39\,0\.28\)\] { box-shadow: 0 -6px 24px rgba(0,40,39,0.28); }
.shadow-\[0_-6px_20px_rgba\(0\,40\,39\,0\.35\)\] { box-shadow: 0 -6px 20px rgba(0,40,39,0.35); }
.shadow-\[0_8px_20px_rgba\(224\,112\,48\,0\.45\)\] { box-shadow: 0 8px 20px rgba(224,112,48,0.45); }
.shadow-\[0_12px_30px_rgba\(0\,0\,0\,0\.4\)\] { box-shadow: 0 12px 30px rgba(0,0,0,0.4); }

/* Typography */
.text-\[10px\] { font-size: 0.875rem; line-height: 1.5; }
.text-\[11px\] { font-size: 0.875rem; line-height: 1.5; }
.text-xs { font-size: 0.875rem; line-height: 1.5; }
.text-sm { font-size: 0.875rem; line-height: 1.5; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.65rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
.text-5xl { font-size: 3rem; line-height: 1; }
.text-6xl { font-size: 3.75rem; line-height: 1; }
.leading-none { line-height: 1; }
.opacity-45 { opacity: 0.45; }
.opacity-90 { opacity: 0.90; }
.scale-105 { transform: scale(1.05); }
.scale-110 { transform: scale(1.10); }
.active\:scale-95:active { transform: scale(0.95); }
.ring-4 { box-shadow: 0 0 0 4px #FFE9B0; }
.ring-\[\#FFE9B0\] { --tw-ring-color: #FFE9B0; }
.rounded-\[36px\] { border-radius: 36px; }
.border-white\/30 { border-color: rgba(255, 255, 255, 0.30); }
.border-\[\#FFE9B0\]\/80 { border-color: rgba(255, 233, 176, 0.80); }
.fill-\[\#E07030\] { fill: #E07030; }
.fill-current { fill: currentColor; }
.p-1\.5 { padding: 0.375rem; }
.px-10 { padding-left: 2.5rem; padding-right: 2.5rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-7 { margin-bottom: 1.75rem; }
.mb-9 { margin-bottom: 2.25rem; }
.-top-2\.5 { top: -0.625rem; }
.-top-3 { top: -0.75rem; }
.top-2\.5 { top: 0.625rem; }
.right-2\.5 { right: 0.625rem; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.font-extrabold { font-weight: 800; }
.uppercase { text-transform: uppercase; }
.tracking-tight { letter-spacing: -0.02em; }
.tracking-wide { letter-spacing: 0.025em; }
.tracking-wider { letter-spacing: 0.05em; }
.leading-\[1\.12\] { line-height: 1.12; }
.leading-\[1\.68\] { line-height: 1.68; }
.leading-\[1\.7\] { line-height: 1.7; }
.leading-tight { line-height: 1.25; }
.leading-snug { line-height: 1.375; }
.leading-relaxed { line-height: 1.625; }
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.underline { text-decoration: underline; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.overflow-hidden { overflow: hidden; }
.overflow-y-auto { overflow-y: auto; }
.select-none { user-select: none; }
.cursor-pointer { cursor: pointer; }
.cursor-not-allowed { cursor: not-allowed; }
.pointer-events-none { pointer-events: none; }
.opacity-40 { opacity: 0.4; }
.h-16 { height: 4rem; }
.object-contain { object-fit: contain; }
.object-cover { object-fit: cover; }
.pr-1 { padding-right: 0.25rem; }
.pt-0 { padding-top: 0; }
.my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
.bg-\[\#FFE9B0\]\/25 { background-color: rgba(255, 233, 176, 0.25); }
.bg-white\/5 { background-color: rgba(255, 255, 255, 0.05); }
.border-\[\#FFE9B0\]\/40 { border-color: rgba(255, 233, 176, 0.4); }
.border-\[\#FFE9B0\]\/50 { border-color: rgba(255, 233, 176, 0.5); }
.border-red-300\/40 { border-color: rgba(252, 165, 165, 0.4); }
.drop-shadow-\[0_2px_5px_rgba\(0\,30\,29\,0\.32\)\] { filter: drop-shadow(0 2px 5px rgba(0, 30, 29, 0.32)); }
.w-\[85\%\] { width: 85%; }
.w-\[52\%\] { width: 52%; }
.w-\[48\%\] { width: 48%; }
.max-w-\[220px\] { max-width: 220px; }
.max-w-\[300px\] { max-width: 300px; }
.max-h-\[300px\] { max-height: 300px; }
.max-h-\[268px\] { max-height: 268px; }
.pb-5 { padding-bottom: 1.25rem; }
.top-1 { top: 0.25rem; }
.left-1 { left: 0.25rem; }
.bottom-2 { bottom: 0.5rem; }
.right-1 { right: 0.25rem; }
.bg-\[\#FFF3D6\] { background-color: #FFF3D6; }
.-left-2\.5 { left: -0.625rem; }
.-bottom-2 { bottom: -0.5rem; }
.-right-2 { right: -0.5rem; }

/* Responsive Breakpoints */
@media (min-width: 640px) {
  .sm\:inline { display: inline; }
  .sm\:block { display: block; }
  .sm\:grid { display: grid; }
  .sm\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .sm\:flex-row { flex-direction: row; }
  .sm\:items-center { align-items: center; }
  .sm\:items-start { align-items: flex-start; }
  .sm\:justify-between { justify-content: space-between; }
  .sm\:justify-start { justify-content: flex-start; }
  .sm\:justify-end { justify-content: flex-end; }
  .sm\:text-left { text-align: left; }
  .sm\:w-auto { width: auto; }
  .sm\:w-full { width: 100%; }
  .sm\:w-1\/2 { width: 50%; }
  .sm\:w-4 { width: 1rem; } .sm\:h-4 { height: 1rem; }
  .sm\:max-w-\[360px\] { max-width: 360px; }
  .sm\:max-h-none { max-height: none; }
  .sm\:aspect-\[16\/11\] { aspect-ratio: 16 / 11; }
  .sm\:p-3 { padding: 0.75rem; }
  .sm\:mx-0 { margin-left: 0; margin-right: 0; }
  .sm\:p-3\.5 { padding: 0.875rem; }
  .sm\:w-5 { width: 1.25rem; } .sm\:h-5 { height: 1.25rem; }
  .sm\:w-6 { width: 1.5rem; } .sm\:h-6 { height: 1.5rem; }
  .sm\:w-9 { width: 2.25rem; } .sm\:h-9 { height: 2.25rem; }
  .sm\:w-11 { width: 2.75rem; } .sm\:h-11 { height: 2.75rem; }
  .sm\:w-14 { width: 3.5rem; } .sm\:h-14 { height: 3.5rem; }
  .sm\:h-9 { height: 2.25rem; }
  .sm\:h-14 { height: 3.5rem; }
  .sm\:h-24 { height: 6rem; }
  .sm\:w-20 { width: 5rem; } .sm\:h-20 { height: 5rem; }
  .sm\:w-24 { width: 6rem; } .sm\:h-24 { height: 6rem; }
  .sm\:w-28 { width: 7rem; } .sm\:h-28 { height: 7rem; }
  .sm\:w-32 { width: 8rem; } .sm\:h-32 { height: 8rem; }
  .sm\:w-56 { width: 14rem; }
  .sm\:w-60 { width: 15rem; } .sm\:h-60 { height: 15rem; }
  .sm\:w-64 { width: 16rem; }
  .sm\:flex-1 { flex: 1 1 0%; }
  .sm\:p-4 { padding: 1rem; }
  .sm\:p-6 { padding: 1.5rem; }
  .sm\:p-7 { padding: 1.75rem; }
  .sm\:p-9 { padding: 2.25rem; }
  .sm\:gap-3 { gap: 0.75rem; }
  .sm\:gap-4 { gap: 1rem; }
  .sm\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sm\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .sm\:text-5xl { font-size: 3rem; line-height: 1; }
  .sm\:text-6xl { font-size: 3.75rem; line-height: 1; }
  .sm\:max-w-\[320px\] { max-width: 320px; }
  .sm\:min-h-\[48px\] { min-height: 48px; }
  .sm\:min-h-\[320px\] { min-height: 320px; }
  .sm\:ml-0 { margin-left: 0; }
  .sm\:mt-8 { margin-top: 2rem; }
  .sm\:mb-4 { margin-bottom: 1rem; }
  .sm\:px-3\.5 { padding-left: 0.875rem; padding-right: 0.875rem; }
  .sm\:px-5 { padding-left: 1.25rem; padding-right: 1.25rem; }
  .sm\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
  .sm\:px-8 { padding-left: 2rem; padding-right: 2rem; }
  .sm\:py-1\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
  .sm\:py-2\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
  .sm\:py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .sm\:pt-4 { padding-top: 1rem; }
  .sm\:p-5 { padding: 1.25rem; }
  .sm\:p-8 { padding: 2rem; }
  .sm\:gap-2 { gap: 0.5rem; }
  .sm\:gap-5 { gap: 1.25rem; }
  .sm\:gap-6 { gap: 1.5rem; }
  .sm\:gap-8 { gap: 2rem; }
  .sm\:rounded-\[32px\] { border-radius: 32px; }
  .sm\:col-span-6 { grid-column: span 6 / span 6; }
  .sm\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sm\:text-xs { font-size: 0.875rem; line-height: 1.5; }
  .sm\:text-sm { font-size: 0.875rem; line-height: 1.5; }
  .sm\:text-base { font-size: 1rem; }
  .sm\:text-lg { font-size: 1.125rem; }
  .sm\:text-xl { font-size: 1.25rem; }
  .sm\:text-2xl { font-size: 1.5rem; }
  .sm\:text-3xl { font-size: 1.875rem; }
  .sm\:text-4xl { font-size: 2.25rem; }
}

@media (min-width: 768px) {
  .md\:flex-row { flex-direction: row; }
  .md\:items-center { align-items: center; }
  .md\:justify-between { justify-content: space-between; }
  .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .md\:col-span-4 { grid-column: span 4 / span 4; }
  .md\:col-span-5 { grid-column: span 5 / span 5; }
  .md\:col-span-7 { grid-column: span 7 / span 7; }
  .md\:col-span-8 { grid-column: span 8 / span 8; }
}

@media (min-width: 1024px) {
  .lg\:hidden { display: none !important; }
  .lg\:flex { display: flex !important; }
  .lg\:flex-row { flex-direction: row; }
  .lg\:items-center { align-items: center; }
  .lg\:justify-between { justify-content: space-between; }
  .lg\:aspect-auto { aspect-ratio: auto; }
  .lg\:h-10 { height: 2.5rem; }
  .lg\:h-16 { height: 4rem; }
  .lg\:h-28 { height: 7rem; }
  .lg\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .lg\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .lg\:col-span-3 { grid-column: span 3 / span 3; }
  .lg\:col-span-4 { grid-column: span 4 / span 4; }
  .lg\:col-span-5 { grid-column: span 5 / span 5; }
  .lg\:col-span-6 { grid-column: span 6 / span 6; }
  .lg\:col-span-7 { grid-column: span 7 / span 7; }
  .lg\:col-span-8 { grid-column: span 8 / span 8; }
  .lg\:col-span-9 { grid-column: span 9 / span 9; }
  .lg\:max-w-\[380px\] { max-width: 380px; }
  .lg\:max-w-\[460px\] { max-width: 460px; }
  .lg\:min-h-\[480px\] { min-height: 480px; }
  .lg\:min-h-\[420px\] { min-height: 420px; }
  .lg\:rounded-\[36px\] { border-radius: 36px; }
  .lg\:px-8 { padding-left: 2rem; padding-right: 2rem; }
  .lg\:py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .lg\:p-4 { padding: 1rem; }
  .lg\:p-10 { padding: 2.5rem; }
  .lg\:pb-12 { padding-bottom: 3rem; }
  .lg\:gap-8 { gap: 2rem; }
  .lg\:text-lg { font-size: 1.125rem; }
  .lg\:text-2xl { font-size: 1.5rem; }
  .lg\:text-4xl { font-size: 2.25rem; }
  .lg\:text-5xl { font-size: 3rem; line-height: 1.1; }
}
"""


def compile_file(rel_path):
    full = os.path.join(ROOT_DIR, rel_path.replace("/", os.sep))
    with open(full, "r", encoding="utf-8") as f:
        code = f.read()
    code = re.sub(r"^\s*import\s+[\s\S]*?from\s+['\"].*?['\"];?\s*$", "", code, flags=re.MULTILINE)
    code = re.sub(r"^\s*import\s+['\"].*?['\"];?\s*$", "", code, flags=re.MULTILINE)
    code = re.sub(r"\bexport\s+default\s+async\s+function\s+", "async function ", code)
    code = re.sub(r"\bexport\s+default\s+function\s+", "function ", code)
    code = re.sub(r"\bexport\s+async\s+function\s+", "async function ", code)
    code = re.sub(r"\bexport\s+function\s+", "function ", code)
    code = re.sub(r"\bexport\s+const\s+", "const ", code)
    compiler = JSXCompiler(code)
    return f"\n// === MODULE: {rel_path} ===\n" + compiler.compile()


def build_full_compiled_js():
    icons_js = JSXCompiler(ICONS_JSX).compile()
    modules_js = "\n".join(compile_file(m) for m in MODULE_ORDER)
    boot_js = """
const rootElement = document.getElementById('root');
ReactDOM.createRoot(rootElement).render(
  React.createElement(RouterComponent, null, React.createElement(App, null))
);
"""
    return "\n".join([OFFLINE_REACT_AND_SHIMS, icons_js, modules_js, boot_js])


def build_standalone_html():
    css_path = os.path.join(ROOT_DIR, "src", "index.css")
    with open(css_path, "r", encoding="utf-8") as f:
        raw_css = f.read()
    clean_css = raw_css.replace('@import "tailwindcss";', "")
    compiled_js = build_full_compiled_js()

    return f"""<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Bukuna - Platform buku cerita anak digital yang penuh nilai, imajinasi, dan petualangan untuk guru TK/SD dan anak-anak." />
    <meta name="theme-color" content="#007A78" />
    <meta property="og:title" content="Bukuna - Cerita Seru Untuk Dunia Kecilnya" />
    <meta property="og:description" content="Platform buku cerita anak digital yang penuh nilai, imajinasi, dan petualangan untuk guru TK/SD dan anak-anak." />
    <meta property="og:image" content="/assets/logo-bukuna.png" />
    <meta property="og:type" content="website" />
    <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon-192x192.png" />
    <link rel="apple-touch-icon" sizes="192x192" href="/assets/favicon-192x192.png" />
    <title>Bukuna - Cerita Seru Untuk Dunia Kecilnya</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Andika:wght@400;700&family=Fredoka:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
{OFFLINE_TAILWIND_CSS}
{clean_css}
    </style>
  </head>
  <body class="bg-[#007A78] text-white antialiased overflow-x-hidden">
    <div id="root"></div>
    <script>
{compiled_js}
    </script>
  </body>
</html>
"""


if __name__ == "__main__":
    html = build_standalone_html()
    with open(os.path.join(ROOT_DIR, "preview.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("Standalone preview.html built successfully! Size:", len(html))
