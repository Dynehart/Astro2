import { MessageFlags } from "discord.js";
import type { ButtonInteraction } from "discord.js";
import { Commands } from "./consts.js";

import type { ButtonHandler, CommandsType } from "./types.js";
import { JoinComponent } from "./components/JoinComponent.js";

type GuildId = string;
type RoleId = string;

// TODO: move the type safe levels here
type RoleLevel = number;

const guilds: Map<GuildId, Map<RoleId, RoleLevel>> = new Map();

// TODO: add a TTL?
const getRoles = (interaction: ButtonInteraction<"cached" | "raw">): Map<RoleId, RoleLevel> => {
    const roles = guilds.get(interaction.guildId);

    if (!roles) {
        if (!interaction.guild) throw new Error("gotta fetch the guild I guess");

        const newRoles = new Map<RoleId, RoleLevel>();

        // TODO: avoid this cast
        interaction.guild.roles.cache.forEach((r) => {
            const roleSegment: string | undefined = r.name.split("RS")[1];
            let level: number | undefined;
            if (roleSegment) {
                level = Number.parseInt(roleSegment);
            }
            if (level) newRoles.set(r.id, level);
        });

        guilds.set(interaction.guildId, newRoles);
        return newRoles;
    }

    return roles;
};

// get user's rs level using the discord role.
// note: best to avoid a custom rbac solution on top of what discord has
// this only works if guild exists the first runs of getRoles. If it doesn't, we need to populate it some other way
const getRsLevel = (interaction: ButtonInteraction<"cached" | "raw">): number => {
    const guildRoles = getRoles(interaction);
    let memberRoles = new Set<string>();

    if (Array.isArray(interaction.member.roles)) {
        interaction.member.roles.map((role) => memberRoles.add(role));
    } else {
        interaction.member.roles.cache.map((role) => memberRoles.add(role.id));
    }

    let level = 0;
    for (const [roleId, lvl] of guildRoles) {
        if (memberRoles.has(roleId)) {
            level = Math.max(level, lvl);
        }
    }

    return level;
};

// create an emphemeral response that has a row with 5 buttons (3 drs and 2 rs)
// we will make the assumption that no one wants to queue for DRS more than 3 levels down and RS more than 2 down
// this allows us to just use 5 buttons instead of a dropdown
// e.g. someone able to do DRS11 gets [DRS11, DRS10, DRS9, RS11, RS10] DRS9 gets [DRS9, DRS8, DRS7, RS9, RS8]
// **based on feedback** we can add a second row  with a dropdown of all other options
const onJoinStart: ButtonHandler = async (interaction) => {
    if (interaction.customId !== Commands.join) throw new Error("incorrect handler assigned");
    if (!interaction.inGuild()) throw new Error("used outside of a guild");

    const level = getRsLevel(interaction);

    await interaction.reply({
        components: JoinComponent(level),
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
};

const onLeaveStart: ButtonHandler = async (interaction) => {
    if (interaction.customId !== Commands.leave) throw new Error("incorrect handler assigned");
};

const onConfig: ButtonHandler = async (interaction) => {
    if (interaction.customId !== Commands.leave) throw new Error("incorrect handler assigned");
};

const onJoin: ButtonHandler = async (interaction) => {
    if (!interaction.customId.startsWith("drs-join-") || !interaction.customId.startsWith("rs-join-")) {
        throw new Error("incorrect handler assigned");
    }

    // TODO: need to handle the actual join

    await interaction.reply({
        content: "pretend you joined the queue",
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
};

// mapping of command to handler
const subcommands: Record<CommandsType, ButtonHandler> = {
    [Commands.join]: onJoinStart,
    [Commands.leave]: onLeaveStart,
    [Commands.config]: onConfig,

    "rs-join-3": onJoin,
    "rs-join-4": onJoin,
    "rs-join-5": onJoin,
    "rs-join-6": onJoin,
    "rs-join-7": onJoin,
    "rs-join-8": onJoin,
    "rs-join-9": onJoin,
    "rs-join-10": onJoin,
    "rs-join-11": onJoin,
    "rs-join-12": onJoin,

    "drs-join-7": onJoin,
    "drs-join-8": onJoin,
    "drs-join-9": onJoin,
    "drs-join-10": onJoin,
    "drs-join-11": onJoin,
    "drs-join-12": onJoin,
};

// not a fan of having this cast but it's more type safe this way
export const commands = subcommands as Record<string, ButtonHandler | undefined>;
