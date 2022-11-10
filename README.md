# postcss-change-color

[![Coverage Status](https://coveralls.io/repos/github/ambar/postcss-change-color/badge.svg?branch=master)](https://coveralls.io/github/ambar/postcss-change-color?branch=master)
[![npm version](https://badgen.net/npm/v/postcss-change-color)](https://www.npmjs.com/package/postcss-change-color)
![](https://badgen.net/npm/types/postcss-change-color)

[PostCSS] plugin to change color, with color scheme (dark mode) support, powered by [Color.js].

```css
.foo {
  /* any literal colors (including hex/rgb/lch/lab...) */
  color: cc(blue a(0.5));
  /* color variables, eg: `:root { --C01: 'red' }` */
  border-color: cc(var(--C01) a(0.5));
  /* color variables with schemes */
  /* eg: `:root { --G01: 'red' } :root[data-theme="dark"] { --G01: 'blue' }` */
  background-color: linear-gradient(cc(var(--G01) a(0)), var(--G01));
}
```

```css
:root {
  --G01_a_0: rgba(255, 0, 0, 0);
}
:root[data-theme='dark'] {
  --G01_a_0: rgba(0, 0, 255, 0);
}
.foo {
  color: rgba(0, 0, 255, 0.5);
  border-color: rgba(255, 0, 0, 0.5);
  background-color: linear-gradient(var(--G01_a_0), var(--G01));
}
```

## Modifiers

- `a()` or `alpha()`: Pass a number between `0~1`, or a percentage between `0%~100%`
- `l()` or `lightness()`: Pass a number between `0~100`, or a percentage between `0%~100%`

## Usage

**Step 1:** Install the plugin:

```sh
npm install --save-dev postcss postcss-change-color
```

**Step 2:** Check your project for existed PostCSS config: `postcss.config.js` in the project root, `"postcss"` section in `package.json` or `postcss` in bundle config.

If you do not use PostCSS, add it according to [official docs] and set this plugin in settings.

**Step 3:** Add the plugin to `plugins` list:

```js
module.exports = {
  plugins: [
    // config plugin
    require('postcss-change-color')(options),
  ],
}
```

### Plugin Options

````ts
type PluginOptions = {
  /** The function name to change color, defaults to `cc` */
  fn?: string
  /**
   * The variables used in `cc()`, use array for color scheme support.
   *
   * Example:
   * ```js
   * {
   *   '--Color1': 'red'
   *   '--Color2': 'blue'
   *   '--ColorGroup1': ['red', 'blue']
   *   '--ColorGroup2': ['--Color1', '--Color2']
   * }
   * ```
   */
  colors?: Record<string, string | string[]>
  /** Color scheme selectors, defaults to `[':root', ':root[data-theme="dark"]']` */
  themeSelectors?: string[]
}
````

[postcss]: https://github.com/postcss/postcss
[color.js]: https://colorjs.io/
[official docs]: https://github.com/postcss/postcss#usage
