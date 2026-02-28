#nullable enable

using System.Text.Json.Serialization;

namespace GameModels
{
  public sealed class GameDataEnvelope
  {
    [JsonPropertyName("gameData")]
    public required GameData GameData { get; set; }
  }

  public sealed class GameData
  {
    [JsonPropertyName("mode")]
    public string? Mode { get; set; } // e.g. "mission-pack"

    [JsonPropertyName("title")]
    public required string Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    // Mission-pack shape
    [JsonPropertyName("games")]
    public List<Mission> Games { get; set; } = new();

    // Backward compatibility (single-game shape)
    [JsonPropertyName("startQuestionId")]
    public string? StartQuestionId { get; set; }

    [JsonPropertyName("questions")]
    public List<Question> Questions { get; set; } = new();
  }

  public sealed class Mission
  {
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("title")]
    public required string Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("missionBrief")]
    public GameMissionBrief? MissionBrief { get; set; }

    [JsonPropertyName("startQuestionId")]
    public required string StartQuestionId { get; set; }

    [JsonPropertyName("questions")]
    public List<Question> Questions { get; set; } = new();
  }

  public class GameMissionBrief
  {
    [JsonPropertyName("objective")]
    public string Objective { get; set; }

    [JsonPropertyName("crownjewel")]
    public string CrownJewel { get; set; }

    [JsonPropertyName("environment")]
    public string Environment { get; set; }

    [JsonPropertyName("constraints")]
    public string Constraints { get; set; }

    [JsonPropertyName("defenses")]
    public string Defenses { get; set; }
  }

  public sealed class Question
  {
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("text")]
    public required string Text { get; set; }

    [JsonPropertyName("choices")]
    public List<Choice> Choices { get; set; } = new();
  }

  public sealed class Choice
  {
    [JsonPropertyName("option")]
    public required string Option { get; set; }

    [JsonPropertyName("nextQuestionId")]
    public string? NextQuestionId { get; set; }

    [JsonPropertyName("isFailure")]
    public bool? IsFailure { get; set; }

    [JsonPropertyName("isWin")]
    public bool? IsWin { get; set; }

    [JsonPropertyName("hint")]
    public string? Hint { get; set; }
  }
}
