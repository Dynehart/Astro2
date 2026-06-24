import type { ButtonInteraction, CacheType } from "discord.js";
import {
    Commands,
    DarkStarMaximum,
    DarkStarMinimum,
    DRSCommandPrefix,
    RedStarMaximum,
    RedStarMinimum,
    RSCommandPrefix,
} from "./consts.js";

// TODO: should support multiple ign for the same userId
// note to self: the best way to ban users is to require ign + star code since ign can be changed
// that way banning is applied to the star code and a user that tries to change their name can't bypass it
export type User = {
    userId: string;
    ign?: string;
    timestamp: number;
    queues?: (RedStar | DarkStar)[];
};

// the drs levels start at 10X (i.e. 107 is DRS 7, 112 is DRS 12)
export const DarkStarLevels = [107, 108, 109, 110, 111, 112] as const;
export type DarkStarLevel = (typeof DarkStarLevels)[number];
export const isDarkStarLevel = (lvl: number): lvl is DarkStarLevel => lvl >= DarkStarMinimum && lvl <= DarkStarMaximum;

export const RedStarLevels = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type RedStarLevel = (typeof RedStarLevels)[number];
export const isRedStarLevel = (lvl: number): lvl is RedStarLevel => lvl >= RedStarMinimum && lvl <= RedStarMaximum;

export type DarkStar = { level: DarkStarLevel; dark: true };
export type RedStar = { level: RedStarLevel; dark: false };

export type JoinCommands = `${typeof RSCommandPrefix}${RedStarLevel}` | `${typeof DRSCommandPrefix}${DarkStarLevel}`;
export type CommandsType = (typeof Commands)[keyof typeof Commands] | JoinCommands;

export type ButtonHandler = (interaction: ButtonInteraction<CacheType>) => Promise<void>;

export type RedStarOptions = { level: number; dark: boolean };

export type CurrentQueue = {
    level: number;
    playerID: string;
    lastseenTimestamp: number;
    joinedTimestamp: number;
    type: number;
    AFKwarned: number;
    dark: number;
};

export type DarkStarQueue = CurrentQueue & {
    level: DarkStarLevel;
    dark: 1;
};
export const isDarkStarQueue = (queue: CurrentQueue): queue is DarkStarQueue => {
    if (queue.dark !== 1) return false;
    if (!isDarkStarLevel(queue.level)) return false;

    return true;
};

export type RedStarQueue = CurrentQueue & {
    level: RedStarLevel;
    dark: 0;
};
export const isRedStarQueue = (queue: CurrentQueue): queue is RedStarQueue => {
    if (queue.dark !== 0) return false;
    if (!isRedStarLevel(queue.level)) return false;

    return true;
};
