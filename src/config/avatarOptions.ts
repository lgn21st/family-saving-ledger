import type { Role } from "../types";

export type AvatarOption = {
  id: string;
  label: string;
  role: Role;
  imagePath: string;
};

export const avatarOptions: AvatarOption[] = [
  {
    id: "parent-1",
    label: "爸爸微笑",
    role: "parent",
    imagePath: "/avatars/01.png",
  },
  {
    id: "parent-2",
    label: "爸爸认真",
    role: "parent",
    imagePath: "/avatars/02.png",
  },
  {
    id: "parent-3",
    label: "妈妈温柔",
    role: "parent",
    imagePath: "/avatars/03.png",
  },
  {
    id: "parent-4",
    label: "妈妈开心",
    role: "parent",
    imagePath: "/avatars/04.png",
  },
  {
    id: "child-1",
    label: "小可爱",
    role: "child",
    imagePath: "/avatars/05.png",
  },
  {
    id: "child-2",
    label: "小天使",
    role: "child",
    imagePath: "/avatars/06.png",
  },
  {
    id: "child-3",
    label: "小公主",
    role: "child",
    imagePath: "/avatars/07.png",
  },
  {
    id: "child-4",
    label: "小萌宝",
    role: "child",
    imagePath: "/avatars/08.png",
  },
  {
    id: "child-5",
    label: "小花仙",
    role: "child",
    imagePath: "/avatars/09.png",
  },
  {
    id: "child-6",
    label: "小画家",
    role: "child",
    imagePath: "/avatars/10.png",
  },
  {
    id: "child-7",
    label: "小学霸",
    role: "child",
    imagePath: "/avatars/11.png",
  },
  {
    id: "child-8",
    label: "小音乐家",
    role: "child",
    imagePath: "/avatars/12.png",
  },
];
