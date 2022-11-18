import type {PluginCreator, Declaration, Helpers, Rule} from 'postcss'
import parser from 'postcss-value-parser'
import type ValueParser from 'postcss-value-parser'
import Color from 'colorjs.io'
import type {Options} from 'colorjs.io/types/src/serialize'

type ColorFormat = Options['format']

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
  /** Color output format, defaults to `rgba_number` (legacy rgba) */
  format?: ColorFormat
}

const defaults: Partial<PluginOptions> = {
  colors: {},
  fn: 'cc',
  themeSelectors: [':root', ':root[data-theme="dark"]'],
  format: 'rgba_number',
}

const changeColor: PluginCreator<PluginOptions> = (options) => {
  const opts = {...defaults, ...options} as Required<PluginOptions>
  const reCC = new RegExp(`\\b${opts.fn}\\(`)
  return {
    postcssPlugin: 'postcss-change-color',
    Once(root, helpers) {
      const rules: Rule[] = []
      root.walkDecls((decl) => {
        transformDecl(decl, opts, helpers, reCC, (r) => rules.push(r))
      })
      rules.reverse().forEach((r) => root.prepend(r))
    },
  }
}

changeColor.postcss = true

const transformDecl = (
  decl: Declaration,
  {colors, fn, themeSelectors, format}: Required<PluginOptions>,
  helpers: Helpers,
  reCC: RegExp,
  onRule: (r: Rule) => void
) => {
  const value = decl.value
  if (!reCC.test(value)) {
    return
  }
  const ast = parser(value)
  ast.walk((node) => {
    if (node.type === 'function' && node.value === fn) {
      const [v, ...modifiers] = node.nodes
      let nodeValue: string, colorValue: string | string[]
      const isPropValue = v.type === 'function' && v.value === 'var'
      if (isPropValue) {
        nodeValue = v.nodes[0].value
        colorValue = colors[nodeValue]
        if (!colorValue) {
          throw decl.error(`Color variable "${nodeValue}" not found`)
        }
      } else {
        nodeValue = colorValue = parser.stringify(v)
      }
      if (Array.isArray(colorValue)) {
        // process color scheme
        const [rootProp] = themeSelectors.map((s, i) => {
          const value = colorValue[i]
          if (!value) {
            throw decl.error(`Color variable "${nodeValue}"[${i}] not found`)
          }
          let schemeColor: string
          if (value.startsWith('--')) {
            schemeColor = colors[value] as string
            if (!schemeColor) {
              throw decl.error(`Color variable "${value}" not found`)
            }
          } else {
            schemeColor = value
          }
          let props = [nodeValue]
          const newColor = transformColor(schemeColor, modifiers, props)
          const prop = props.join('_')
          const rule = new helpers.Rule({selector: themeSelectors[i]})
          rule.append(
            new helpers.Declaration({
              prop,
              value: newColor.toString({format}),
            })
          )
          onRule(rule)
          return prop
        })
        node.type = 'function'
        node.value = 'var'
        // @ts-expect-error Oops, no helper in value-parser
        node.nodes = [{type: 'word', value: rootProp}]
      } else {
        // process literal color
        const newColor = transformColor(colorValue, modifiers)
        // @ts-expect-error Oops, no helper in value-parser
        node.type = 'word'
        node.value = newColor.toString({format})
      }
    }
  })
  decl.value = ast.toString()
}

const transformColor = (
  from: string,
  modifiers: ValueParser.Node[],
  props: string[] = []
) => {
  return modifiers.reduce((acc, v) => {
    if (v.type === 'function') {
      const value = parser.stringify(v.nodes)
      if (value) {
        if (v.value === 'a' || v.value === 'alpha') {
          acc.alpha = modifyValue(acc.alpha, value, 1)
          props.push('a', toIdent(value))
        } else if (v.value === 'l' || v.value === 'lightness') {
          acc.lch.l = modifyValue(acc.lch.l, value, 100)
          props.push('l', toIdent(value))
        }
      }
    }
    return acc
  }, new Color(from))
}

// https://w3c.github.io/csswg-drafts/css-syntax-3/#typedef-ident-token
const toIdent = (str: string) =>
  str
    .replace(/[+]/g, 'plus')
    .replace(/[-]/g, 'minus')
    .replace(/[*]/g, 'mul')
    .replace(/[%]/g, 'pct')
    .replace(/[^a-z0-9-_]/gi, '_')

const modifyValue = (initial: number, byValue: string, max: number) => {
  const isRelative = /^[-+*]/.test(byValue)
  const number = isRelative ? parseFloat(byValue.slice(1)) : parseFloat(byValue)
  const isPct = byValue.endsWith('%')
  const value = isPct ? (number / 100) * max : number
  if (byValue.startsWith('+')) {
    return initial + value
  }
  if (byValue.startsWith('-')) {
    return initial - value
  } else if (byValue.startsWith('*')) {
    return initial * value
  }
  return value
}

export default changeColor
