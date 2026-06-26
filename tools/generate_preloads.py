# tools/generate_preloads.py
import os
import json
import re

project_root = os.getcwd()
template_path = os.path.join(project_root, 'index.html')
worlds_dir = os.path.join(project_root, 'Worlds')
registry_path = os.path.join(worlds_dir, 'WorldList.json')

if not os.path.exists(template_path):
    print(f"Missing template index.html at {template_path}")
    exit(1)

if not os.path.exists(registry_path):
    print(f"Missing WorldList.json at {registry_path}")
    exit(1)

with open(template_path, 'r', encoding='utf-8') as f:
    template_html = f.read()

with open(registry_path, 'r', encoding='utf-8') as f:
    worlds = json.load(f)

def escape_script_tags(text):
    if not text:
        return ""
    return re.sub(r'</script>', r'<\\/script>', text, flags=re.IGNORECASE)

def get_accent_color(world_ref_path, theme):
    if not theme:
        return None, None
    css_path = os.path.join(project_root, world_ref_path, theme)
    if not os.path.exists(css_path):
        return None, None
    
    try:
        with open(css_path, 'r', encoding='utf-8') as f:
            css_text = f.read()
        
        accent_color = None
        accent_color_rgb = None
        
        accent_match = re.search(r'--(?:primary-)?accent\s*:\s*([^;/\n]+)', css_text)
        if accent_match:
            accent_color = accent_match.group(1).strip()
            
        rgb_match = re.search(r'--(?:primary-)?accent-rgb\s*:\s*([^;/\n]+)', css_text)
        if rgb_match:
            accent_color_rgb = rgb_match.group(1).strip()
        elif accent_color and accent_color.startswith('#'):
            hex_val = accent_color.replace('#', '')
            r, g, b = None, None, None
            if len(hex_val) == 3:
                r = int(hex_val[0] + hex_val[0], 16)
                g = int(hex_val[1] + hex_val[1], 16)
                b = int(hex_val[2] + hex_val[2], 16)
            elif len(hex_val) == 6:
                r = int(hex_val[0:2], 16)
                g = int(hex_val[2:4], 16)
                b = int(hex_val[4:6], 16)
            if r is not None and g is not None and b is not None:
                accent_color_rgb = f"{r}, {g}, {b}"
                
        return accent_color, accent_color_rgb
    except Exception as e:
        print(f"Could not parse theme variables: {e}")
        return None, None

for world_folder in worlds:
    world_ref_path = f"Worlds/{world_folder}"
    world_path = os.path.join(worlds_dir, world_folder)
    world_json_path = os.path.join(world_path, 'world.json')
    if not os.path.exists(world_json_path):
        continue

    print(f"Processing preloads for world: {world_folder}")
    with open(world_json_path, 'r', encoding='utf-8') as f:
        world_meta = json.load(f)
    world_meta['path'] = world_ref_path
    
    accent_color, accent_color_rgb = get_accent_color(world_ref_path, world_meta.get('theme'))
    if accent_color:
        world_meta['accentColor'] = accent_color
    if accent_color_rgb:
        world_meta['accentColorRgb'] = accent_color_rgb

    bot_ids = list(set((world_meta.get('bots') or []) + (world_meta.get('featuredBots') or [])))

    bots = []
    markdown_files = []

    # 1. Read main world lore
    if world_meta.get('lore'):
        world_lore_path = os.path.join(world_path, world_meta['lore'])
        if os.path.exists(world_lore_path):
            with open(world_lore_path, 'r', encoding='utf-8') as f:
                markdown = f.read()
            markdown_files.append({
                'path': f"{world_ref_path}/{world_meta['lore']}",
                'content': markdown
            })

    # 2. Read each bot config and its markdown files
    for bot_id in bot_ids:
        bot_dir = os.path.join(world_path, 'characters', bot_id)
        bot_json_path = os.path.join(bot_dir, f"data/{bot_id}.json")
        if not os.path.exists(bot_json_path):
            print(f"Registered bot JSON not found: {bot_json_path}")
            continue

        with open(bot_json_path, 'r', encoding='utf-8') as f:
            bot_data = json.load(f)
        
        bot_data['worldId'] = world_meta['id']
        bot_data['worldTitle'] = world_meta['title']
        bot_data['worldAuthor'] = world_meta.get('author') or None
        bot_data['worldAccent'] = world_meta.get('accentColor') or None
        bot_data['worldAccentRgb'] = world_meta.get('accentColorRgb') or None
        
        bot_data['cardImage'] = f"{world_ref_path}/characters/{bot_id}/{bot_data['cardImage']}" if bot_data.get('cardImage') else None
        bot_data['avatar'] = f"{world_ref_path}/characters/{bot_id}/{bot_data['avatar']}" if bot_data.get('avatar') else None
        bot_data['sprite'] = f"{world_ref_path}/characters/{bot_id}/{bot_data['sprite']}" if bot_data.get('sprite') else None
        
        original_lore = bot_data.get('lore')
        original_scenario = bot_data.get('scenario')
        
        bot_data['lore'] = f"characters/{bot_id}/{original_lore}" if original_lore else None
        bot_data['scenario'] = f"characters/{bot_id}/{original_scenario}" if original_scenario else None

        bots.append(bot_data)

        # Read bot lore markdown
        if original_lore:
            bot_lore_path = os.path.join(bot_dir, original_lore)
            if os.path.exists(bot_lore_path):
                with open(bot_lore_path, 'r', encoding='utf-8') as f:
                    markdown = f.read()
                markdown_files.append({
                    'path': f"{world_ref_path}/characters/{bot_id}/{original_lore}",
                    'content': markdown
                })

        # Read bot scenario markdown
        if original_scenario:
            bot_scenario_path = os.path.join(bot_dir, original_scenario)
            if os.path.exists(bot_scenario_path):
                with open(bot_scenario_path, 'r', encoding='utf-8') as f:
                    markdown = f.read()
                markdown_files.append({
                    'path': f"{world_ref_path}/characters/{bot_id}/{original_scenario}",
                    'content': markdown
                })

    # Construct preloaded data block
    preloaded_world_data = {
        'worldId': world_meta['id'],
        'worldConfig': world_meta,
        'bots': bots
    }

    # Compile Markdown script tags
    markdown_inject = ""
    for file in markdown_files:
        safe_id = 'preloaded-markdown-' + re.sub(r'[^a-zA-Z0-9_-]', '-', file['path'])
        markdown_inject += f'  <script type="text/markdown" id="{safe_id}" data-path="{file["path"]}">\n'
        markdown_inject += f"{escape_script_tags(file['content'])}\n"
        markdown_inject += '  </script>\n'

    # Generate hidden sitemap links for SEO
    sitemap_html = "\n    <nav>\n"
    sitemap_html += "      <a href=\"index.html\">Nexus Core</a>\n"
    sitemap_html += f"      <a href=\"{world_meta['id']}.html\">{world_meta['title']} Chronicles</a>\n"
    for b in bots:
        sitemap_html += f"      <a href=\"bot-{b['id']}.html\">{b['name']} Profile</a>\n"
    sitemap_html += "    </nav>\n"

    # Helper function to compile and write output HTML
    def compile_html_file(filename, title, description, is_bot_page):
        inject_html = "\n  <!-- Embedded World Metadata & Lore Content -->\n"
        inject_html += '  <script type="application/json" id="preloaded-world-data">\n'
        inject_html += f"  {escape_script_tags(json.dumps(preloaded_world_data, indent=2))}\n"
        inject_html += '  </script>\n'

        if is_bot_page:
            bot_name = title.split(' ')[0]
            json_ld_data = {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": bot_name,
                "description": description,
                "memberOf": {
                    "@type": "CreativeWork",
                    "name": world_meta['title']
                }
            }
        else:
            json_ld_data = {
                "@context": "https://schema.org",
                "@type": "CreativeWork",
                "name": world_meta['title'],
                "description": world_meta.get('description') or "",
                "genre": world_meta.get('genres') or [],
                "author": {
                    "@type": "Person",
                    "name": world_meta['author']
                } if world_meta.get('author') else None,
                "character": [
                    {
                        "@type": "Person",
                        "name": b['name'],
                        "description": b.get('description') or ""
                    } for b in bots
                ]
            }
        json_ld_str = json.dumps(json_ld_data, indent=2)

        inject_html += '  <script type="application/ld+json" id="preloaded-world-jsonld">\n'
        inject_html += f"  {escape_script_tags(json_ld_str)}\n"
        inject_html += '  </script>\n'
        inject_html += markdown_inject

        res_html = template_html.replace('<!-- PRELOADED_DATA_PLACEHOLDER -->', inject_html.strip())
        res_html = res_html.replace('<!-- SEO_LINKS_PLACEHOLDER -->', sitemap_html.strip())

        # Update Title
        res_html = re.sub(r'<title>[^<]*</title>', f"<title>{title}</title>", res_html, flags=re.IGNORECASE)

        # Update Meta Description
        escaped_desc = description.replace('"', '&quot;')
        desc_meta = f'<meta name="description" content="{escaped_desc}">'
        if re.search(r'<meta\s+name="description"\s+content="[^"]*"', res_html, flags=re.IGNORECASE):
            res_html = re.sub(r'<meta\s+name="description"\s+content="[^"]*"', desc_meta, res_html, flags=re.IGNORECASE)
        else:
            res_html = re.sub(r'</head>', f"  {desc_meta}\n</head>", res_html, flags=re.IGNORECASE)

        output_path = os.path.join(project_root, filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(res_html)
        print(f"Generated preloaded static file: {filename}")

    # A. Generate World HTML file
    world_title = f"{world_meta['title']} - World Nexus"
    world_desc = world_meta.get('description') or ""
    compile_html_file(f"{world_meta['id']}.html", world_title, world_desc, False)

    # B. Generate Bot HTML files
    for bot in bots:
        bot_title = f"{bot['name']} - {world_meta['title']} - World Nexus"
        bot_desc = bot.get('description') or f"Read historical chronicles and lore about {bot['name']} in {world_meta['title']}."
        compile_html_file(f"bot-{bot['id']}.html", bot_title, bot_desc, True)

print("Static preloads generation complete.")
