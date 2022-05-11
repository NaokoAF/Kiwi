const GIST_API_URL = "https://api.github.com/gists/";

const params = new URLSearchParams(window.location.search);
let gistId = null;
let songData = null;
let songMap = new Map();

$(document).ready(onLoad);

function onLoad(){
	if(params.has("gist")){
		gistId = params.get("gist");
		console.log("Gist " + gistId);

		loadGist();
	}else{
		console.log("No Gist specified");
	}

	$("#song-search").submit((e) => {
		e.preventDefault();
		// updateSearch();
	});

	$("#song-search-field").change(() => updateSearch());
}

function loadGist(){
	const gistCache = localStorage.getItem("gistCache");
	if(gistCache != null){
		console.log("Loading gist from cache");
		// const cacheDate = localStorage.getItem("gistCacheDate");
		onLoadGist(JSON.parse(gistCache));
		return;
	}

	$.getJSON(GIST_API_URL + gistId, function(data){
		onLoadGist(data);
	});
}

function onLoadGist(data){
	localStorage.setItem("gistCache", JSON.stringify(data));
	localStorage.setItem("gistCacheDate", new Date());

	const chSongsFileName = `Kiwi-${"CH"}-songs.json`;
	const chQueueFileName = `Kiwi-${"CH"}-queue.json`;
	const chSongsFile = data.files[chSongsFileName];
	const chQueueFile = data.files[chSongsFileName];
	if(!chSongsFile || !chQueueFile){
		console.log("No CH file found");
		return;
	}

	const songsCache = localStorage.getItem("songsCache");
	if(songsCache != null){
		console.log("Loading songs from cache");
		onLoadSongs(JSON.parse(songsCache));
		return;
	}

	if(chSongsFile.truncated){
		$.getJSON(chSongsFile.raw_url, function(songData){
			localStorage.setItem("songsCache", JSON.stringify(songData));
			localStorage.setItem("songsCacheDate", new Date());
			onLoadSongs(songData);
		});
	}else{
		onLoadSongs(chSongsFile.content);
	}
}

function onLoadSongs(data){
	if(!data || !data.hash || !data.songs){
		console.log("Invalid song data");
		return;
	}

	songData = data;
	songMap.clear();

	for(const song of data.songs){
		if(songMap.has(song.hash)){
			continue;
		}

		const metadata = song.metadata;

		let source = data.sources[metadata.icon];
		if(source)
			source = source.replace("=' ", ""); // not necessary anymore
		else
			source = song.folder.split("\\")[0]; // this is gross

		song.source = source;

		$("#song-list").append(`
			<div class="song" id="song-${song.hash}">
				<div class="song__title">
					<div class="song__name">${metadata.name}</div>
					<div class="song__artist">${metadata.artist}</div>
					<div class="song__charter">${metadata.charter}</div>
				</div>
				<div class="song__info">${metadata.album} (${metadata.year}) • ${metadata.genre} • ${formatLength(metadata.song_length)}</div>
				<div class="song__info">${song.source}</div>

				<div class="song__hash">!request ${song.hash}</div>
			</div>
		`);

		songMap.set(song.hash, $(`#song-${song.hash}`));
	}

	console.log(data.songs.length + " songs loaded");
	console.log(data.songs);
	console.log(data.sources);
	console.log(data.songs[0]);

	updateSearch();
}

function formatLength(length){
	const totalSeconds = length / 1000;

	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor(totalSeconds / 60 % 3600);
	const seconds = Math.floor(totalSeconds % 60);

	let result = "";
	if(hours > 0)
		result += hours + ":";
	if(minutes > 0)
		result += minutes.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false }) + ":";

	result += seconds.toLocaleString("en-US", { minimumIntegerDigits: 2, useGrouping: false });

	return result;
}

function updateSearch(){
	const query = $("#song-search-field").val().trim().toLowerCase();

	if(query === ""){
		for(const song of songData.songs){
			const $songElement = songMap.get(song.hash);
			if($songElement){
				$songElement.show();
			}
		}
	}else{
		for(const song of songData.songs){
			const $songElement = songMap.get(song.hash);
			if($songElement){
				let found = false;
				if(song.hash.toLowerCase() === query){
					found = true;
				}else{
					const metadata = song.metadata;
					const fields = [
						metadata.name,
						metadata.artist,
						metadata.charter,
						metadata.genre,
						metadata.year,
						metadata.icon,
						song.folder,
						song.source,
					];

					for(const field of fields){
						if(!field) continue;

						if(field.toLowerCase().includes(query)){
							found = true;
							break;
						}
					}
				}

				if(found){
					$songElement.show();
				}else{
					$songElement.hide();
				}
			}
		}
	}
}