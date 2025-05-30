{
  "targets": [
    {
      "target_name": "audio_capture",
      "sources": [
        "src/native/audio_capture.cpp",
        "src/native/wasapi_manager.cpp",
        "src/native/device_enumerator.cpp",
        "src/native/audio_processor.cpp"
      ],
      "include_dirs": [
        "<!(node -e \"console.log(require('node-addon-api').include)\")",
        "src/native/include"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "UNICODE",
        "_UNICODE",
        "WIN32_LEAN_AND_MEAN",
        "NOMINMAX"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "libraries": [
        "-lole32",
        "-loleaut32",
        "-luuid",
        "-lwinmm",
        "-lksuser"
      ],
      "conditions": [
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }]
      ]
    }
  ]
}
