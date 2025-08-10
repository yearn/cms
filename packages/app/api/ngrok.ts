import ngrok from 'ngrok'

async function startNgrok(): Promise<string> {
  const url = await ngrok.connect(3001)
  console.log(`ngrok tunnel opened at ${url}`)
  return url
}

async function main(): Promise<void> {
  try {
    await startNgrok()
  } catch (error) {
    console.error('Error starting dev environment:', error)
  }
}

main()
