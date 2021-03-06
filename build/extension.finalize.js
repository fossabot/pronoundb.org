const { join, basename } = require('path')
const { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync, createReadStream, createWriteStream } = require('fs')
const archiver = require('archiver')

const manifest = require('./manifest.browser.json')
const { version } = require('../package.json')

function mkdirOverwrite (path) {
  if (existsSync(path)) {
    for (const file of readdirSync(path)) {
      const full = join(path, file)
      if (statSync(full).isDirectory()) {
        rmdirRf(full)
      } else {
        unlinkSync(full)
      }
    }
  } else {
    mkdirSync(path)
  }
}

manifest.version = version
const production = process.argv.includes('--pack')
const extensionDistPath = join(__dirname, '..', 'dist', 'extension')
const extensionCodePath = join(__dirname, '..', 'extension')
const files = [
  join(extensionDistPath, 'background.js'),
  join(extensionDistPath, 'pronoundb.js'),
  join(extensionDistPath, 'popup.js'),
  join(extensionCodePath, 'popup.css'),
  join(extensionCodePath, 'popup.html'),

  production && join(extensionDistPath, 'background.js.map'),
  production && join(extensionDistPath, 'pronoundb.js.map'),
  production && join(extensionDistPath, 'popup.js.map')
].filter(Boolean)

if (production) {
  // Create zip
  const dest = join(__dirname, '..', 'dist', 'extension', 'pronoundb.zip')
  const destFf = join(__dirname, '..', 'dist', 'extension', 'pronoundb.firefox.zip')
  const zip = archiver('zip', { zlib: { level: 9 } })
  const zipFf = archiver('zip', { zlib: { level: 9 } })
  zip.pipe(createWriteStream(dest))
  zipFf.pipe(createWriteStream(destFf))

  for (const file of files) {
    zip.append(createReadStream(file), { name: basename(file) })
    zipFf.append(createReadStream(file), { name: basename(file) })
  }

  zip.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })
  zipFf.append(
    JSON.stringify({ ...manifest, browser_specific_settings: { gecko: { id: "firefox-addon@pronoundb.org" } } }, null, 2),
    { name: 'manifest.json' }
  )

  zip.finalize()
  zipFf.finalize()
} else {
  manifest.name += ' (dev)'
  manifest.permissions.push('http://localhost:8080/api/v1/*')
  if (process.argv.includes('--firefox')) {
    manifest.browser_specific_settings = { gecko: { id: "firefox-addon+dev@pronoundb.org" } }
  }

  const dest = join(__dirname, '..', 'dist', 'extension', 'unpacked')
  mkdirOverwrite(dest)

  for (const file of files) {
    writeFileSync(
      join(dest, basename(file)),
      readFileSync(file, 'utf8')
    )
  }

  writeFileSync(join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2))
}
