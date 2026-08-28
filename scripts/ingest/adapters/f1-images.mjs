// Static F1 driver image map — Jolpica/Ergast returns no images, so the F1
// adapter looks driver portraits up here by Jolpica driverId.
//
// URLs are Wikimedia Commons files (each driver's English Wikipedia page
// image via the PageImages API, 512px+ thumbs) — stable, hotlink-friendly
// hosting. Every driver in the current (2026) championship standings is
// covered; all 23 URLs verified HTTP 200 with an image/* content-type on
// 2026-08-28. A future driver missing from this map simply ingests with a
// null image (the contract's imageUrl is optional) — extend the map when the
// grid changes.
export const F1_DRIVER_IMAGES = {
  albon:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Alex_Albon_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8626%29_%28cropped%29.jpg/960px-Alex_Albon_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8626%29_%28cropped%29.jpg",
  alonso:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Alonso-68_%2824710447098%29.jpg/960px-Alonso-68_%2824710447098%29.jpg",
  antonelli:
    "https://upload.wikimedia.org/wikipedia/commons/f/f3/Kimi_Antonelli_at_the_2025_US_Grand_Prix_in_Austin%2C_TX_%28cropped%29.jpg",
  arvid_lindblad:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Arvid_Lindblad_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7869%29_%28cropped%29.jpg/960px-Arvid_Lindblad_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7869%29_%28cropped%29.jpg",
  bearman:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/2025_Japan_GP_-_Haas_-_Oliver_Bearman_-_Thursday_%28cropped%29.jpg/960px-2025_Japan_GP_-_Haas_-_Oliver_Bearman_-_Thursday_%28cropped%29.jpg",
  bortoleto:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Gabriel_Bortoleto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8581%29_cropped.jpg/960px-Gabriel_Bortoleto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8581%29_cropped.jpg",
  bottas:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Valtteri_Bottas_at_the_2026_Adelaide_Motorsport_Festival_%28028A7556%29.jpg/960px-Valtteri_Bottas_at_the_2026_Adelaide_Motorsport_Festival_%28028A7556%29.jpg",
  colapinto:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Franco_Colapinto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8698%29_cropped.jpg/960px-Franco_Colapinto_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8698%29_cropped.jpg",
  gasly:
    "https://upload.wikimedia.org/wikipedia/commons/6/61/2022_French_Grand_Prix_%2852279066548%29_%28cropped%29_%28cropped%29.png",
  hadjar:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Isack_Hadjar_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8753%29_%28cropped%29.jpg/960px-Isack_Hadjar_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8753%29_%28cropped%29.jpg",
  hamilton:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Prime_Minister_Keir_Starmer_meets_Sir_Lewis_Hamilton_%2854566928382%29_%28cropped%29.jpg/960px-Prime_Minister_Keir_Starmer_meets_Sir_Lewis_Hamilton_%2854566928382%29_%28cropped%29.jpg",
  hulkenberg:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/2019_Formula_One_tests_Barcelona%2C_Hulkenberg_%2840287128313%29.jpg/960px-2019_Formula_One_tests_Barcelona%2C_Hulkenberg_%2840287128313%29.jpg",
  lawson:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Liam_Lawson_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7795%29.jpg/960px-Liam_Lawson_at_the_Red_Bull_Fan_Zone_%E2%80%93_Crown_Riverwalk%2C_Melbourne_%28028A7795%29.jpg",
  leclerc:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Charles_Leclerc_at_the_2026_Cannes_Film_Festival_%28cropped%29.jpg/960px-Charles_Leclerc_at_the_2026_Cannes_Film_Festival_%28cropped%29.jpg",
  max_verstappen:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3973_by_Stepro_%28medium_crop%29.jpg/960px-2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3973_by_Stepro_%28medium_crop%29.jpg",
  norris:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3968_by_Stepro_%28cropped2%29.jpg/960px-2024-08-25_Motorsport%2C_Formel_1%2C_Gro%C3%9Fer_Preis_der_Niederlande_2024_STP_3968_by_Stepro_%28cropped2%29.jpg",
  ocon: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Esteban_Ocon_2024_Suzuka_%28cropped%29.jpg/960px-Esteban_Ocon_2024_Suzuka_%28cropped%29.jpg",
  perez:
    "https://upload.wikimedia.org/wikipedia/commons/7/7a/Sergio_P%C3%A9rez_2019_%28cropped%29.jpg",
  piastri:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/2026_Chinese_GP_-_Oscar_Piastri_%28cropped%29_%28cropped%29.jpg/960px-2026_Chinese_GP_-_Oscar_Piastri_%28cropped%29_%28cropped%29.jpg",
  russell:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/KingsLeonSilverstne040724_%2828_of_112%29_%2853838006028%29_%28cropped%29.jpg/960px-KingsLeonSilverstne040724_%2828_of_112%29_%2853838006028%29_%28cropped%29.jpg",
  sainz:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Formula1Gabelhofen2022_%2804%29_%28cropped2%29.jpg/960px-Formula1Gabelhofen2022_%2804%29_%28cropped2%29.jpg",
  stroll:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/2025_Japan_GP_-_Aston_Martin_-_Lance_Stroll_-_Fanzone_Stage_%28cropped%29.jpg/960px-2025_Japan_GP_-_Aston_Martin_-_Lance_Stroll_-_Fanzone_Stage_%28cropped%29.jpg",
  tsunoda:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Yuki_Tsunoda_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8096%29.jpg/960px-Yuki_Tsunoda_at_the_Melbourne_Walk_during_the_2026_Australian_Grand_Prix_%28028A8096%29.jpg",
};
