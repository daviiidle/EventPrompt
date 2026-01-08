import Container from "components/ui/Container";
import { marketingCopy } from "content/marketing";

const Footer = () => {
  return (
    <footer className="border-t border-white/70 py-10 text-sm text-gray-500 dark:border-gray-800">
      <Container>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-semibold text-gray-900 dark:text-white">{marketingCopy.brand.name}</span>
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <a href="#" className="transition hover:text-gray-900 dark:hover:text-white">
              Privacy
            </a>
            <a href="#" className="transition hover:text-gray-900 dark:hover:text-white">
              Terms
            </a>
            <a href="#" className="transition hover:text-gray-900 dark:hover:text-white">
              Contact
            </a>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{marketingCopy.footer.note}</span>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
