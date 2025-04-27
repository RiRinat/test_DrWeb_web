from django.shortcuts import render
import json

from django.views import View

from .store import KVStore
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.shortcuts import render
import json

store = KVStore()

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

@method_decorator(csrf_exempt, name='dispatch')
class CommandView(View):
    def post(self, request, *args, **kwargs):
        try:
            body = json.loads(request.body)
            command = body.get('command', '')
            if not command:
                return JsonResponse({'error': 'No command provided'}, status=400)

            parts = command.strip().split()
            output = []

            def capture_print(msg):
                output.append(msg)

            cmd = parts[0].upper()

            if cmd == 'SET':
                store.set(parts[1], parts[2])
                capture_print(f"SET {parts[1]} {parts[2]} OK")
            elif cmd == 'GET':
                value = store.get(parts[1])
                capture_print(value)
            elif cmd == 'UNSET':
                store.unset(parts[1])
                capture_print(f"UNSET {parts[1]} OK")
            elif cmd == 'COUNTS':
                count = store.counts(parts[1])
                capture_print(str(count))
            elif cmd == 'FIND':
                keys = store.find(parts[1])
                capture_print(' '.join(keys) if keys else "NONE")
            elif cmd == 'BEGIN':
                store.begin()
                capture_print("BEGIN OK")
            elif cmd == 'ROLLBACK':
                success = store.rollback()
                capture_print("ROLLBACK OK" if success else "NO TRANSACTION")
            elif cmd == 'COMMIT':
                success = store.commit()
                capture_print("COMMIT OK" if success else "NO TRANSACTION")
            else:
                capture_print(f"INVALID COMMAND: {command}")

            return JsonResponse({'output': output})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    def get(self, request, *args, **kwargs):
        return render(request, 'index.html')

    def http_method_not_allowed(self, request, *args, **kwargs):
        return JsonResponse({'error': 'Method not allowed'}, status=405)

