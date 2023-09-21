import postcss from 'postcss'
import type {AcceptedPlugin} from 'postcss'
import prettier from 'prettier'
import plugin from './index'

async function process(
  input: string,
  opts?: Parameters<typeof plugin>[0],
  plugins: AcceptedPlugin[] = []
) {
  const result = await postcss([plugin(opts), ...plugins]).process(input, {
    from: undefined,
  })
  return prettier.format(result.css, {parser: 'css'})
}

test('process readme', async () => {
  const colors = {
    '--C01': 'red',
    '--G01': ['red', 'blue'],
  }

  expect(
    await process(
      `
      .foo {
        color: cc(blue a(0.5));
        border-color: cc(var(--C01) a(0.5));
        background-color: linear-gradient(cc(var(--G01) a(0)), var(--G01));
      }
  `,
      {colors}
    )
  ).toMatchInlineSnapshot(`
    ":root {
      --G01_a_0: rgba(255, 0, 0, 0);
    }
    :root[data-theme="dark"] {
      --G01_a_0: rgba(0, 0, 255, 0);
    }
    .foo {
      color: rgba(0, 0, 255, 0.5);
      border-color: rgba(255, 0, 0, 0.5);
      background-color: linear-gradient(var(--G01_a_0), var(--G01));
    }
    "
  `)
})

test('process chaining', async () => {
  expect(
    await process(`
      a {
        color: cc(blue a(0.5) l(50));
      }
    `)
  ).toMatchInlineSnapshot(`
    "a {
      color: rgba(129.66, 84.857, 255, 0.5);
    }
    "
  `)
})

test('process edge cases', async () => {
  expect(
    await process(`
      a {
        color: cc(blue a());
        color: cc(blue l());
      }
    `)
  ).toMatchInlineSnapshot(`
    "a {
      color: rgba(0, 0, 255);
      color: rgba(0, 0, 255);
    }
    "
  `)
})

test('process literal colors / alpha', async () => {
  expect(
    await process(`
      a {
        color: cc(blue a(0.5));
        color: cc(#00f a(0.5));
        color: cc(rgb(0 0 255) a(0.5));
      }
    `)
  ).toMatchInlineSnapshot(`
    "a {
      color: rgba(0, 0, 255, 0.5);
      color: rgba(0, 0, 255, 0.5);
      color: rgba(0, 0, 255, 0.5);
    }
    "
  `)
})

test('process literal colors / lightness', async () => {
  expect(
    await process(`
      a {
        color: cc(blue l(50));
        color: cc(#00f l(50));
        color: cc(rgb(0 0 255) l(50));
      }
    `)
  ).toMatchInlineSnapshot(`
    "a {
      color: rgba(129.66, 84.857, 255);
      color: rgba(129.66, 84.857, 255);
      color: rgba(129.66, 84.857, 255);
    }
    "
  `)
})

test('process alias', async () => {
  expect(await process(`a { color: cc(red a(0.5)) }`)).toBe(
    await process(`a { color: cc(red alpha(0.5)) }`)
  )
  expect(await process(`a { color: cc(red l(0.5)) }`)).toBe(
    await process(`a { color: cc(red lightness(0.5)) }`)
  )
})

test('process var', async () => {
  const colors = {
    '--Color1': 'red',
    '--Color2': 'blue',
    '--ColorGroup1': ['red', 'blue'],
    '--ColorGroup2': ['--Color1', '--Color2'],
  }

  expect(
    await process(
      `
    a {
      color: cc(var(--Color1) a(0.5));
      border-color: cc(var(--ColorGroup1) a(0.5));
      background: linear-gradient(
        cc(var(--ColorGroup2) alpha(0)),
        cc(var(--ColorGroup2) alpha(.9))
      );
    }
  `,
      {colors}
    )
  ).toMatchInlineSnapshot(`
    ":root {
      --ColorGroup1_a_0_5: rgba(255, 0, 0, 0.5);
    }
    :root[data-theme="dark"] {
      --ColorGroup1_a_0_5: rgba(0, 0, 255, 0.5);
    }
    :root {
      --ColorGroup2_a_0: rgba(255, 0, 0, 0);
    }
    :root[data-theme="dark"] {
      --ColorGroup2_a_0: rgba(0, 0, 255, 0);
    }
    :root {
      --ColorGroup2_a__9: rgba(255, 0, 0, 0.9);
    }
    :root[data-theme="dark"] {
      --ColorGroup2_a__9: rgba(0, 0, 255, 0.9);
    }
    a {
      color: rgba(255, 0, 0, 0.5);
      border-color: var(--ColorGroup1_a_0_5);
      background: linear-gradient(var(--ColorGroup2_a_0), var(--ColorGroup2_a__9));
    }
    "
  `)
})

test('relative modify', async () => {
  expect(
    await process(`a {
    color: cc(rgb(0 0 0 / .5) a(+0.1)) ;
    color: cc(rgb(0 0 0 / .5) a(+ 0.1)) ;
    color: cc(rgb(0 0 0 / .5) a(-0.1)) ;
    color: cc(rgb(0 0 0 / .5) a(- 0.1)) ;
    color: cc(rgb(0 0 0 / .5) a(+2%)) ;
    color: cc(rgb(0 0 0 / .5) a(+ 2%)) ;
    color: cc(rgb(0 0 0 / .5) a(-2%)) ;
    color: cc(rgb(0 0 0 / .5) a(- 2%)) ;
    color: cc(rgb(0 0 0 / .5) a(*1.2)) ;
    color: cc(rgb(0 0 0 / .5) a(* 1.2)) ;
  }`)
  ).toMatchInlineSnapshot(`
    "a {
      color: rgba(0, 0, 0, 0.6);
      color: rgba(0, 0, 0, 0.6);
      color: rgba(0, 0, 0, 0.4);
      color: rgba(0, 0, 0, 0.4);
      color: rgba(0, 0, 0, 0.52);
      color: rgba(0, 0, 0, 0.52);
      color: rgba(0, 0, 0, 0.48);
      color: rgba(0, 0, 0, 0.48);
      color: rgba(0, 0, 0, 0.6);
      color: rgba(0, 0, 0, 0.6);
    }
    "
  `)
})

test('throw', async () => {
  // invalid color
  await expect(process(`a { color: cc(x a(0)) }`)).rejects.toThrowError(
    /Could not parse x as a color/
  )

  // var not found
  await expect(process(`a { color: cc(var(--x) a(0)) }`)).rejects.toThrowError(
    /Color variable \"--x\" not found/
  )

  // group var not found
  const colors = {
    '--C01': 'red',
    '--C02': 'blue',
    '--CERR1': 'x',
    '--GERR0': [],
    '--GERR1': ['--x', '--C02'],
    '--GERR2': ['--C01', '--y'],
    '--GERR3': ['x', 'y'],
  }
  await expect(
    process(`a { color: cc(var(--CERR1) a(0)) }`, {colors})
  ).rejects.toThrowError(/Could not parse x as a color/)
  await expect(
    process(`a { color: cc(var(--GERR0) a(0)) }`, {colors})
  ).rejects.toThrowError(/Color variable \"--GERR0\"\[0\] not found/)
  await expect(
    process(`a { color: cc(var(--GERR1) a(0)) }`, {colors})
  ).rejects.toThrowError(/Color variable \"--x\" not found/)
  await expect(
    process(`a { color: cc(var(--GERR2) a(0)) }`, {colors})
  ).rejects.toThrowError(/Color variable \"--y\" not found/)
  await expect(
    process(`a { color: cc(var(--GERR3) a(0)) }`, {colors})
  ).rejects.toThrowError(/Could not parse x as a color/)
})

test('work with mixins', async () => {
  const colors = {
    '--C01': 'red',
    '--G01': ['red', 'blue'],
  }

  expect(
    await process(
      `
      .foo {
        background: var(--C01);
        @mixin xOutline;
      }
  `,
      {colors},
      [
        require('postcss-custom-properties')({
          preserve: true,
        }),
        require('@csstools/postcss-global-data')({
          files: ['./__fixtures__/vars.css'],
        }),
        require('postcss-mixins')({
          mixins: {
            xOutline: {
              color: 'var(--G01)',
              border: 'cc(var(--G01) a(0.5))',
              '::after': {
                color: 'var(--G01)',
                border: 'cc(var(--G01) a(0.5))',
              },
            },
          },
        }),
      ]
    )
  ).toMatchInlineSnapshot(`
    ":root {
      --G01_a_0_5: rgba(255, 0, 0, 0.5);
    }
    :root[data-theme="dark"] {
      --G01_a_0_5: rgba(0, 0, 255, 0.5);
    }
    :root {
      --G01_a_0_5: rgba(255, 0, 0, 0.5);
    }
    :root[data-theme="dark"] {
      --G01_a_0_5: rgba(0, 0, 255, 0.5);
    }
    .foo {
      color: var(--G01);
      border: var(--G01_a_0_5);
      ::after {
        color: var(--G01);
        border: var(--G01_a_0_5);
      }
    }
    "
  `)
})
