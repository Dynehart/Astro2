import { TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ContainerBuilder } from "discord.js";
import type { MessageActionRowComponentBuilder } from "discord.js";
import { DarkStarMinimum, DRSCommandPrefix, RedStarMinimum, RSCommandPrefix } from "../consts.js";
import { isDarkStarLevel, isRedStarLevel } from "../types.js";
import type { DarkStarLevel, JoinCommands, RedStarLevel } from "../types.js";

/** this is the ephemeral component that shows buttons to users based on their rs level */
export const JoinComponent = (level: number): ContainerBuilder[] => {
    const drs: DarkStarLevel[] = [];
    for (let i = level; i >= DarkStarMinimum && drs.length < 3; i--) {
        if (!isDarkStarLevel(i)) throw new Error("bad logic");
        drs.unshift(i);
    }

    const rs: RedStarLevel[] = [];
    for (let i = level; i >= RedStarMinimum && drs.length + rs.length < 5; i--) {
        if (!isRedStarLevel(i)) throw new Error("bad logic");
        rs.unshift(i);
    }

    const buttons: ButtonBuilder[] = [];

    drs.forEach((lvl) => {
        const commandId: JoinCommands = `${DRSCommandPrefix}${lvl}`;
        buttons.push(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel(`DRS ${lvl}`)
                .setEmoji({ name: ":8RedStar:" })
                .setCustomId(commandId),
        );
    });

    rs.forEach((lvl) => {
        const commandId: JoinCommands = `${RSCommandPrefix}${lvl}`;
        buttons.push(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                .setLabel(`RS ${lvl}`)
                .setEmoji({ name: ":8YellowStar:" })
                .setCustomId(commandId),
        );
    });

    const descriptionComponent = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder({ content: "placeholder text to see what this looks like in action" }),
    );

    const selectionComponent = new ContainerBuilder().addActionRowComponents(
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons),
    );

    return [descriptionComponent, selectionComponent];
};
