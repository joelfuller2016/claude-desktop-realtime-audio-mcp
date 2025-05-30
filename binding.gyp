{
  "targets": [
    {
      "target_name": "audio_module",
      "type": "shared_library",
      "sources": [
        "src/native/audio_capture.cpp",
        "src/native/device_enumerator.cpp",
        "src/native/wasapi_client.cpp",
        "src/native/audio_module.cpp"
      ],
      "include_dirs": [
        "<!(node -e \"console.log(require('node-addon-api').include)\")",
        "src/native/include"
      ],
      "dependencies": [
        "<!(node -e \"console.log(require('node-addon-api').gyp)\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "UNICODE",
        "_UNICODE",
        "WIN32_LEAN_AND_MEAN",
        "NOMINMAX"
      ],
      "cflags_cc": [
        "/std:c++17",
        "/EHsc"
      ],
      "conditions": [
        [
          "OS=='win'",
          {
            "libraries": [
              "ole32.lib",
              "oleaut32.lib",
              "winmm.lib",
              "ksuser.lib",
              "avrt.lib"
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "AdditionalOptions": [
                  "/std:c++17"
                ]
              },
              "VCLinkerTool": {
                "AdditionalDependencies": [
                  "ole32.lib",
                  "oleaut32.lib",
                  "winmm.lib",
                  "ksuser.lib",
                  "avrt.lib"
                ]
              }
            }
          }
        ]
      ]
    }
  ]
}