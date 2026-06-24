// import {
//     TextDisplayBuilder,
//     ButtonBuilder,
//     ButtonStyle,
//     ActionRowBuilder,
//     ContainerBuilder,
//     SectionBuilder,
// } from "discord.js";
// import type { MessageActionRowComponentBuilder } from "discord.js";
// import { Commands, DarkStarMinimum, DRSCommandPrefix, RedStarMinimum, RSCommandPrefix } from "./consts.js";
// import { isDarkStarLevel, isRedStarLevel } from "./types.js";
// import type { DarkStar, DarkStarLevel, JoinCommands, RedStar, RedStarLevel, User } from "./types.js";
// import { getCurrentQueues, getCustomId } from "./helpers.js";

// /** builds the component of a given queue. this replaces the main component */
// export const buildQueueComponent = (props: (DarkStar | RedStar) & { users: User[] }): ContainerBuilder => {
//     const { level, users } = props;

//     const content = users.map((user) => `<t:${user.timestamp}:R> <@${user.userId}>`).join("\n");
//     const customId = getCustomId(props);

//     const section = new SectionBuilder()
//         .addTextDisplayComponents(new TextDisplayBuilder({ content: `RS ${level}` }))
//         .setButtonAccessory(new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("+").setCustomId(customId));

//     return (
//         new ContainerBuilder()
//             // higher level -> darker
//             .setAccentColor([255 - 16 * level, 0, 0])
//             .addSectionComponents(section)
//             .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
//     );
// };

// /** this is the static set of buttons that should always be at the bottom of any queue */
// const buildMainContainer = (): ContainerBuilder => {
//     return new ContainerBuilder().addActionRowComponents(
//         // TODO: need to figure out how exactly to use emojis
//         new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
//             new ButtonBuilder()
//                 .setStyle(ButtonStyle.Success)
//                 // .setLabel(":heavy_plus_sign:")
//                 .setEmoji({ name: ":heavy_plus_sign:" })
//                 .setCustomId(Commands.join),
//             new ButtonBuilder()
//                 .setStyle(ButtonStyle.Danger)
//                 // .setLabel(":heavy_multiplication_x:")
//                 .setEmoji({ name: ":heavy_multiplication_x:" })
//                 .setCustomId(Commands.leave),
//             new ButtonBuilder().setStyle(ButtonStyle.Secondary).setDisabled(),
//             new ButtonBuilder().setStyle(ButtonStyle.Secondary).setDisabled(),
//             new ButtonBuilder()
//                 .setStyle(ButtonStyle.Secondary)
//                 // .setLabel(":gear:")
//                 .setEmoji({ name: ":gear:" })
//                 .setCustomId(Commands.config),
//         ),
//     );
// };

// /** t */
// export const MainComponent = async (): Promise<ContainerBuilder[]> => {
//     const component: ContainerBuilder[] = [];

//     const queues = await getCurrentQueues();
//     queues.sort((a, b) => a.level - b.level);
//     for (const queue of queues) {
//         component.push(buildQueueComponent({ level: queue.level, dark: queue.type === 0 }));
//     }

//     component.push(buildMainContainer());

//     return component;
// };

// /** this is the ephemeral component that shows buttons to users based on their rs level */
// export const JoinComponent = (level: number): ContainerBuilder[] => {
//     const drs: DarkStarLevel[] = [];
//     for (let i = level; i >= DarkStarMinimum && drs.length < 3; i--) {
//         if (!isDarkStarLevel(i)) throw new Error("bad logic");
//         drs.unshift(i);
//     }

//     const rs: RedStarLevel[] = [];
//     for (let i = level; i >= RedStarMinimum && drs.length + rs.length < 5; i--) {
//         if (!isRedStarLevel(i)) throw new Error("bad logic");
//         rs.unshift(i);
//     }

//     const buttons: ButtonBuilder[] = [];

//     drs.forEach((lvl) => {
//         const commandId: JoinCommands = `${DRSCommandPrefix}${lvl}`;
//         buttons.push(
//             new ButtonBuilder()
//                 .setStyle(ButtonStyle.Success)
//                 .setLabel(`DRS ${lvl}`)
//                 .setEmoji({ name: ":8RedStar:" })
//                 .setCustomId(commandId),
//         );
//     });

//     rs.forEach((lvl) => {
//         const commandId: JoinCommands = `${RSCommandPrefix}${lvl}`;
//         buttons.push(
//             new ButtonBuilder()
//                 .setStyle(ButtonStyle.Success)
//                 .setLabel(`RS ${lvl}`)
//                 .setEmoji({ name: ":8YellowStar:" })
//                 .setCustomId(commandId),
//         );
//     });

//     const descriptionComponent = new ContainerBuilder().addTextDisplayComponents(
//         new TextDisplayBuilder({ content: "placeholder text to see what this looks like in action" }),
//     );

//     const selectionComponent = new ContainerBuilder().addActionRowComponents(
//         new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons),
//     );

//     return [descriptionComponent, selectionComponent];
// };
