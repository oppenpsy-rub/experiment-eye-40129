import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { ParticipantData } from "@/types/experiment";

interface ParticipantSelectorProps {
  participants: ParticipantData[];
  selectedParticipantId: string | null;
  onSelectParticipant: (id: string) => void;
}

export const ParticipantSelector = ({ 
  participants, 
  selectedParticipantId, 
  onSelectParticipant 
}: ParticipantSelectorProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Proband auswählen</h3>
          <p className="text-sm text-muted-foreground">
            {participants.length} Probanden verfügbar
          </p>
        </div>
      </div>
      
      <Select value={selectedParticipantId || undefined} onValueChange={onSelectParticipant}>
        <SelectTrigger>
          <SelectValue placeholder="Wählen Sie einen Probanden..." />
        </SelectTrigger>
        <SelectContent>
          {participants.map((participant) => (
            <SelectItem key={participant.id} value={participant.id}>
              {participant.participantCode || `Proband ${participant.id}`} - {participant.gender}, {participant.age} Jahre
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Card>
  );
};
