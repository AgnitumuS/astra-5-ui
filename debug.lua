local spath = debug.getinfo(1).source:sub(2):match("(.*)/")

function load_resource(server, client, request)
    if not request then return nil end

    if request.path:find("^/app/") then
        request.path = request.path:sub(5)
    end
    local f = io.open(spath .. request.path)
    if not f then
        server:abort(client, 404)
        return nil
    end
    local content = f:read("*all")
    f:close()

    local ext = request.path:match("%.(.*)$")
    local ct = mime[ext]
    if not ct then ct = default_mime end

    server:send(client, {
        code = 200,
        headers = {
            "Content-Type: " .. ct,
            "Connection: close",
        },
        content = content,
    })
end

astra_storage["/"] = [[<!DOCTYPE html>
<html lang="en">
<head>
    <title>Astra Control Panel</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="/app/pony.css">
    <link rel="stylesheet" href="/app/app.css">
</head>
<body>
<script src="/app/pony.js"></script>
<script src="/app/app.js"></script>
<script src="/app/dashboard.js"></script>
<script src="/app/stream.js"></script>
<script src="/app/adapter.js"></script>
<script src="/app/sessions.js"></script>
<script src="/app/settings.js"></script>
<script src="/app/settings-general.js"></script>
<script src="/app/settings-users.js"></script>
<script src="/app/settings-hls.js"></script>
<script src="/app/settings-http-play.js"></script>
<script src="/app/settings-softcam.js"></script>
<script src="/app/settings-cas.js"></script>
<script src="/app/settings-groups.js"></script>
<script src="/app/settings-servers.js"></script>
<script src="/app/settings-theme.js"></script>
<script src="/app/settings-import.js"></script>
<script src="/app/settings-edit.js"></script>
<script src="/app/settings-restart.js"></script>
<script src="/app/log.js"></script>
<script src="/mod.js"></script>
</body>
</html>
]]

astra_storage["/app/pony.css"] = load_resource
astra_storage["/app/pony.js"] = load_resource

astra_storage["/app/app.css"] = load_resource
astra_storage["/app/app.js"] = load_resource

astra_storage["/app/dashboard.js"] = load_resource
astra_storage["/app/stream.js"] = load_resource
astra_storage["/app/adapter.js"] = load_resource
astra_storage["/app/sessions.js"] = load_resource
astra_storage["/app/settings.js"] = load_resource
astra_storage["/app/settings-general.js"] = load_resource
astra_storage["/app/settings-users.js"] = load_resource
astra_storage["/app/settings-hls.js"] = load_resource
astra_storage["/app/settings-http-play.js"] = load_resource
astra_storage["/app/settings-softcam.js"] = load_resource
astra_storage["/app/settings-cas.js"] = load_resource
astra_storage["/app/settings-groups.js"] = load_resource
astra_storage["/app/settings-servers.js"] = load_resource
astra_storage["/app/settings-transcoding.js"] = load_resource
astra_storage["/app/settings-theme.js"] = load_resource
astra_storage["/app/settings-import.js"] = load_resource
astra_storage["/app/settings-edit.js"] = load_resource
astra_storage["/app/settings-restart.js"] = load_resource
astra_storage["/app/log.js"] = load_resource
