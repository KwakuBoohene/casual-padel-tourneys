import { Button, Text, TextInput, View } from "react-native";

interface NameStepViewProps {
  name: string;
  canContinue: boolean;
  onChangeName: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function NameStepView(props: NameStepViewProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "700" }}>Tournament Name</Text>
      <TextInput
        value={props.name}
        onChangeText={props.onChangeName}
        placeholder="Friday Americano"
        style={{ borderWidth: 1, padding: 10, width: "90%", maxWidth: 420 }}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Back" onPress={props.onBack} />
        <Button title="Next" disabled={!props.canContinue} onPress={props.onNext} />
      </View>
    </View>
  );
}
