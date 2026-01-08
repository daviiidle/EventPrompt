import { HiOutlineBellAlert, HiOutlineCamera, HiOutlineClipboardDocumentCheck, HiOutlineUserGroup } from "react-icons/hi2";
import Container from "components/ui/Container";
import { marketingCopy } from "content/marketing";

const Features = () => {
  const icons = [HiOutlineUserGroup, HiOutlineBellAlert, HiOutlineCamera, HiOutlineClipboardDocumentCheck];

  return (
    <section id="features" className="py-20 sm:py-24">
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
            {marketingCopy.features.heading}
          </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{marketingCopy.features.subheading}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {marketingCopy.features.items.map((item, index) => {
            const Icon = icons[index];

            return (
            <div
              key={item.title}
              className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/60"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/70 text-gray-700 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200">
                {Icon ? <Icon className="h-5 w-5" /> : null}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
            </div>
          );
          })}
        </div>
      </Container>
    </section>
  );
};

export default Features;
