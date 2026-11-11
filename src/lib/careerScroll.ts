import { selectCareer } from "./careerSelection";

type Go = (index: number) => void;
let impl: Go | null = null;

/** Registered by CareerScrollController. Scroll mode → scrolls to that node's hold point; static mode → selects. */
export const registerCareerScroll = (fn: Go | null) => {
  impl = fn;
};

/** UI entry point for "go to career entry i" (selector buttons, PREV/NEXT). Independent of the 3D layer. */
export const goToCareer = (index: number) => (impl ? impl(index) : selectCareer(index));
