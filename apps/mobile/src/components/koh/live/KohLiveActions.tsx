import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { CareerOptInRow } from "../../organizer/create/CareerOptInRow";

interface KohLiveActionsProps {
  canEnterResult: boolean;
  ended: boolean;
  onEnterResult: () => void;
  onSwap: () => void;
  onRename: () => void;
  onShare: () => void;
  onRank: () => void;
  onEnd: () => void;
  onHome: () => void;
  contributeToCareerLeaderboard: boolean;
  careerSaving: boolean;
  onSetContributeToCareerLeaderboard: (value: boolean) => void;
}

export function KohLiveActions(props: KohLiveActionsProps) {
  const { colors } = useTheme();
  const chip = (label: string, onPress: () => void, disabled?: boolean) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
      {!props.ended ? (
        <Pressable
          disabled={!props.canEnterResult}
          onPress={props.onEnterResult}
          style={{
            minHeight: touch.minPrimary,
            borderRadius: radius.lg,
            backgroundColor: props.canEnterResult ? colors.primary : colors.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            opacity: props.canEnterResult ? 1 : 0.5
          }}
        >
          <Text
            style={{
              color: props.canEnterResult ? colors.onPrimary : colors.muted,
              fontWeight: "700",
              fontSize: 17
            }}
          >
            Enter result
          </Text>
        </Pressable>
      ) : (
        <View
          style={{
            minHeight: touch.minSecondary,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.md
          }}
        >
          <Text style={{ color: colors.muted, fontWeight: "600" }}>Night ended · read-only</Text>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        {chip("Swap", props.onSwap, props.ended)}
        {chip("Edit", props.onRename, props.ended)}
        {chip("Share", props.onShare)}
        {chip("Rank", props.onRank)}
      </View>
      {!props.ended ? (
        <Pressable
          onPress={props.onEnd}
          style={{
            minHeight: touch.minSecondary,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>End night</Text>
        </Pressable>
      ) : null}
      <CareerOptInRow
        value={props.contributeToCareerLeaderboard}
        disabled={props.careerSaving}
        onChange={props.onSetContributeToCareerLeaderboard}
      />
      <Pressable onPress={props.onHome} style={{ alignItems: "center", paddingVertical: spacing.sm }}>
        <Text style={{ color: colors.muted, fontWeight: "600" }}>Home</Text>
      </Pressable>
    </View>
  );
}
