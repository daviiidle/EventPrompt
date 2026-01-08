import Container from "components/ui/Container";
import { marketingCopy } from "content/marketing";

const FAQ = () => {
  return (
    <section id="faq" className="py-20 sm:py-24">
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
            {marketingCopy.faq.heading}
          </h2>
        </div>
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          {marketingCopy.faq.items.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:border-white/80 dark:border-gray-800 dark:bg-gray-900/60"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-900 dark:text-white">
                {item.question}
                <span className="ml-4 text-gray-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default FAQ;
