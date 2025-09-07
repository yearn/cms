import EgFooter from './eg/Footer'

export default function Footer() {
  return (
    <EgFooter className="mt-auto justify-end">
      <a
        href="https://github.com/yearn/cms"
        target="_blank"
        rel="noopener"
        className="flex items-center gap-2 text-content-secondary hover:text-content-primary transition-colors"
      >
        https://github.com/yearn/cms
      </a>
    </EgFooter>
  )
}
