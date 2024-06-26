import React, { useState } from "react";
import { Button, ButtonGroup, Modal, Textarea } from "flowbite-react";
import DownloadIcon from "./DownloadIcon";
import UploadIcon from "./UploadIcon";
import { pokemon } from "../../lib/pokemonInterface";

export default function Component({
  pokemonParty,
  setPokemonParty,
}: {
  pokemonParty: pokemon[];
  setPokemonParty: React.Dispatch<React.SetStateAction<pokemon[]>>;
}) {
  const [showModal, setShowModal] = useState(false);
  const [importText, setImportText] = useState("");

  const capitalizeFirstLetter = (str: string): string => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const statIndexToName = (index: number): string => {
    switch (index) {
      case 0:
        return "HP";
      case 1:
        return "Atk";
      case 2:
        return "Def";
      case 3:
        return "SpA";
      case 4:
        return "SpD";
      case 5:
        return "Spe";
      default:
        return "";
    }
  };

  const formatPokemonData = (pokemon: pokemon): string => {
    let output = `${capitalizeFirstLetter(pokemon.name)} @ ${capitalizeFirstLetter(pokemon.item)}\n`;
    output += `Ability: ${capitalizeFirstLetter(pokemon.ability)}\n`;

    if (pokemon.tera_type) {
      output += `Tera Type: ${capitalizeFirstLetter(pokemon.tera_type)}\n`;
    }

    if (pokemon.ev) {
      const evs = Object.entries(pokemon.ev)
        .filter(([_, value]) => value > 0)
        .map(([stat, value]) => `${value} ${statIndexToName(parseInt(stat))}`)
        .join(" / ");
      output += `EVs: ${evs}\n`;
    }

    output += `${capitalizeFirstLetter(pokemon.nature)} Nature\n`;

    pokemon.moves.forEach((move) => {
      output += `- ${capitalizeFirstLetter(move)}\n`;
    });

    return output + "\n";
  };

  const exportPokemonParty = () => {
    const formattedData = pokemonParty.map(formatPokemonData).join("");
    navigator.clipboard
      .writeText(formattedData)
      .then(() => {
        alert("Pokémon party data copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  const importPokemonParty = async () => {
    const importedParty = await parsePokemonParty(importText);
    if (importedParty) {
      setPokemonParty(importedParty);
      setShowModal(false);
      setImportText("");
      alert("Pokémon party data imported successfully!");
    } else {
      alert("Invalid Pokémon party data format. Please check the input.");
    }
  };

  const parsePokemonParty = async (data: string): Promise<pokemon[] | null> => {
    const pokemonStrings = data
      .split("\n\n")
      .filter((str) => str.trim() !== "");
    const parsedParty: pokemon[] = [];

    for (const pokemonString of pokemonStrings) {
      const parsedPokemon = await parsePokemonData(pokemonString);
      if (parsedPokemon) {
        parsedParty.push(parsedPokemon as pokemon);
      } else {
        return null; // If any Pokémon fails to parse, return null
      }
    }

    return parsedParty;
  };

  const parsePokemonData = async (data: string): Promise<pokemon | null> => {
    const lines = data.split("\n").map((line) => line.trim());
    if (lines.length < 3) return null;

    const [nameItem, abilityLine, ...rest] = lines;
    const [name, item] = nameItem.split("@").map((s) => s.trim());
    const ability = abilityLine.split(":")[1].trim();

    let sprite: string = "";
    let id: number = 0;
    let ev: [number, number, number, number, number, number] = [
      0, 0, 0, 0, 0, 0,
    ];
    let iv: [number, number, number, number, number, number] = [
      31, 31, 31, 31, 31, 31,
    ];
    let tera_type: string = "";
    let nature: string = "";
    let moves: [string, string, string, string] = ["", "", "", ""];

    rest.forEach((line) => {
      if (line.startsWith("EVs:")) {
        const evs = line.substring(4).split("/");
        evs.forEach((stat) => {
          const [value, name] = stat.trim().split(" ");
          const index = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"].indexOf(name);
          if (index !== -1) {
            ev[index] = parseInt(value);
          }
        });
      } else if (line.startsWith("Tera Type:")) {
        tera_type = line.split(":")[1].trim();
      } else if (line.endsWith("Nature")) {
        nature = line.split(" ")[0];
      } else if (line.startsWith("-")) {
        const moveIndex = moves.findIndex((move) => move === "");
        if (moveIndex !== -1) {
          moves[moveIndex] = line.substring(1).trim();
        }
      }
    });

    try {
      const response = await fetch(
        `/api/pokemon?name=${encodeURIComponent(name.toLowerCase())}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch Pokémon data");
      }
      const data = await response.json();
      id = data.id;
      sprite = data.sprites.front_default;
    } catch (error) {
      console.error("Error fetching Pokémon data:", error);
    }

    return {
      name: name.toLowerCase(),
      id: id,
      sprite: sprite.toLowerCase(),
      level: 100,
      item: item.toLowerCase(),
      ability: ability.toLowerCase(),
      ev: ev,
      iv: iv,
      tera_type: tera_type?.toLowerCase(),
      nature: nature.toLowerCase(),
      moves: moves,
    };
  };

  return (
    <div className="flex flex-col items-center gap-2 m-4">
      <ButtonGroup>
        <Button color="gray" onClick={() => setShowModal(true)}>
          <DownloadIcon className="mr-3" />
          Import
        </Button>
        <Button
          color="gray"
          onClick={exportPokemonParty}
          disabled={pokemonParty.length <= 0}
        >
          <UploadIcon className="mr-3" />
          Export
        </Button>
      </ButtonGroup>
      <p className="text-gray-500 text-xs">From Pokemon Showdown</p>

      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <Modal.Header>Import Pokémon Party Data</Modal.Header>
        <Modal.Body>
          <Textarea
            rows={10}
            placeholder="Paste Pokémon party data here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={importPokemonParty}>Import</Button>
          <Button color="gray" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
