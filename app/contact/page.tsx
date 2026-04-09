import { Metadata } from "next";
import ContactPageClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact Zafry Imthisam - Let's Connect",
  description:
    "Get in touch with Zafry Imthisam. Find contact information, social media links, and professional networking opportunities.",
  keywords: [
    "contact Zafry Imthisam",
    "developer contact",
    "linkedin",
    "github",
    "instagram",
    "gmail",
    "connect with developer",
    "professional contact",
    "social media",
  ],
  openGraph: {
    title: "Contact Zafry Imthisam - Let's Connect",
    description:
      "Connect with Zafry Imthisam through LinkedIn, GitHub, Instagram, and email. Let's build something together.",
    siteName: "Zafry.dev",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Zafry Imthisam",
    description:
      "Let's connect! Find Zafry Imthisam's contact information and social media profiles.",
    creator: "@ZafryImthisam",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
