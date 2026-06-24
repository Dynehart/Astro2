import { query } from "../pool.js";
import { boolToInt } from "../utils.js";
import { RSJoinCommand } from "./consts.js";
import type { RedStarOptions, CurrentQueue, RedStar, DarkStar, JoinCommands } from "./types.js";

export const getCurrentQueue = async ({ level, dark }: RedStar | DarkStar): Promise<CurrentQueue[]> => {
    const [result] = await query<CurrentQueue>(
        `SELECT level, playerID, lastseenTimestamp, joinedTimestamp, type, AFKwarned, dark FROM rsqueueuser WHERE level = ${level} AND dark = ${boolToInt(dark)}`,
    );

    return result;
};


export const getCurrentQueues = async (): Promise<CurrentQueue[]> => {
    const [result] = await query<CurrentQueue>(
        `SELECT level, playerID, lastseenTimestamp, joinedTimestamp, type, AFKwarned, dark FROM rsqueueuser`,
    );

    return result;
};

const getPlayerQueues = async (playerID: string) => {
    const [result] = await query<RedStar | DarkStar>(
        `SELECT level, dark FROM rsqueueuser WHERE playerID = ${playerID} AND type = 0`,
    );
};

export const getCustomId = ({ level, dark }: DarkStar | RedStar): JoinCommands => {
    if (dark) return `${RSJoinCommand}-${level}`;
    return `${RSJoinCommand}-${level}`;
};
