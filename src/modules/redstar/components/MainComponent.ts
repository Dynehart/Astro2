import {
    TextDisplayBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ContainerBuilder,
    SectionBuilder,
} from "discord.js";
import type { MessageActionRowComponentBuilder } from "discord.js";
import { Commands } from "../consts.js";
import { DarkStarLevels, isDarkStarQueue, isRedStarQueue, RedStarLevels } from "../types.js";
import type { DarkStar, RedStar, User, CurrentQueue, DarkStarLevel, RedStarLevel } from "../types.js";
import { getCurrentQueues, getCustomId } from "../helpers.js";

/** builds the component of a given queue. this replaces the main component */
const buildQueueComponent = (props: (DarkStar | RedStar) & { users: User[] }): ContainerBuilder => {
    const { level, users } = props;

    const content = users.map((user) => `<t:${user.timestamp}:R> <@${user.userId}>`).join("\n");
    const customId = getCustomId(props);

    const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder({ content: `RS ${level}` }))
        .setButtonAccessory(new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("+").setCustomId(customId));

    return (
        new ContainerBuilder()
            // higher level -> darker
            .setAccentColor([255 - 16 * level, 0, 0])
            .addSectionComponents(section)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
    );
};

/** this is the static set of buttons that should always be at the bottom of any queue */
const InteractionComponent = (): ContainerBuilder => {
    return new ContainerBuilder().addActionRowComponents(
        // TODO: need to figure out how exactly to use emojis
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                // .setLabel(":heavy_plus_sign:")
                .setEmoji({ name: ":heavy_plus_sign:" })
                .setCustomId(Commands.join),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                // .setLabel(":heavy_multiplication_x:")
                .setEmoji({ name: ":heavy_multiplication_x:" })
                .setCustomId(Commands.leave),
            new ButtonBuilder().setStyle(ButtonStyle.Secondary).setDisabled(),
            new ButtonBuilder().setStyle(ButtonStyle.Secondary).setDisabled(),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                // .setLabel(":gear:")
                .setEmoji({ name: ":gear:" })
                .setCustomId(Commands.config),
        ),
    );
};

const getPresortedQueues = <T extends RedStarLevel | DarkStarLevel>(levels: readonly T[]): Map<T, User[]> => {
    const queues = new Map<T, User[]>();
    levels.forEach((level) => queues.set(level, []));

    return queues;
};

const idk = <T extends RedStarLevel | DarkStarLevel, S extends CurrentQueue & { level: T }>(
    currentQueues: CurrentQueue[],
    levels: readonly T[],
    predicate: (value: CurrentQueue) => value is S,
): Map<T, User[]> => {
    const rsMap = getPresortedQueues(levels);
    const queue = currentQueues.filter((queue) => predicate(queue));

    queue.forEach(({ level, playerID, joinedTimestamp }) => {
        const user: User = { userId: playerID, timestamp: joinedTimestamp };
        const users = rsMap.get(level) ?? [];
        users.push(user);
        rsMap.set(level, users);
    });
    return rsMap;
};

const QueueComponents = <T extends RedStarLevel | DarkStarLevel, S extends CurrentQueue & { level: T }>(
    currentQueues: CurrentQueue[],
    levels: readonly T[],
    predicate: (value: CurrentQueue) => value is S,
): ContainerBuilder[] => {
    const components: ContainerBuilder[] = [];

    const map = getPresortedQueues(levels);

    currentQueues
        .filter((queue) => predicate(queue))
        .forEach(({ level, playerID, joinedTimestamp }) => {
            const user: User = { userId: playerID, timestamp: joinedTimestamp };
            const users = map.get(level) ?? [];
            users.push(user);
            map.set(level, users);
        });
    // const map = idk(currentQueues, levels, predicate);

    for (const [level, users] of map) {
        components.push(buildQueueComponent({ level, dark: true, users }));
    }
};

/** t */
export const MainComponent = async (): Promise<ContainerBuilder[]> => {
    const component: ContainerBuilder[] = [];

    const currentQueues = await getCurrentQueues();

    // const rsMap = getPresortedQueues(RedStarLevels);
    // const dsMap = getPresortedQueues(DarkStarLevels);

    // const rsQueue = currentQueues.filter((queue) => isRedStarQueue(queue));
    // const dsQueue = currentQueues.filter((queue) => isDarkStarQueue(queue));

    // rsQueue.forEach(({ level, playerID, joinedTimestamp }) => {
    //     const user: User = { userId: playerID, timestamp: joinedTimestamp };
    //     const users = rsMap.get(level) ?? [];
    //     users.push(user);
    //     rsMap.set(level, users);
    // });

    // dsQueue.forEach(({ level, playerID, joinedTimestamp }) => {
    //     const user: User = { userId: playerID, timestamp: joinedTimestamp };
    //     const users = dsMap.get(level) ?? [];
    //     users.push(user);
    //     dsMap.set(level, users);
    // });

    const rsMap = idk(currentQueues, RedStarLevels, isRedStarQueue);
    const dsMap = idk(currentQueues, DarkStarLevels, isDarkStarQueue);

    for (const [level, users] of dsMap) {
        component.push(buildQueueComponent({ level, dark: true, users }));
    }

    for (const [level, users] of rsMap) {
        component.push(buildQueueComponent({ level, dark: false, users }));
    }

    component.push(InteractionComponent());

    return component;
};
