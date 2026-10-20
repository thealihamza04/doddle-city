import { createFileRoute } from "@tanstack/react-router";
import { DoodleCity } from "../components/DoodleCity";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Doodle City — an endless 3D crowd" },
      { name: "description", content: "Fly a drone over an infinite doodle city full of hand-drawn characters going about their day." },
      { property: "og:title", content: "Doodle City — an endless 3D crowd" },
      { property: "og:description", content: "Fly over an infinite doodle crowd, Times Square style." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoodleCity,
});
