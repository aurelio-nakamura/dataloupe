import csv, random, datetime
random.seed(42)
regions=["North","South","East","West","Central"]
cats=["Electronics","Home","Grocery","Apparel","Toys","Sports"]
channels=["online","in-store","partner"]
start=datetime.date(2024,1,1)
rows=[]
for i in range(3200):
    d=start+datetime.timedelta(days=random.randint(0,540))
    region=random.choice(regions)
    cat=random.choice(cats)
    ch=random.choice(channels)
    units=max(1,int(random.gauss(20,12)))
    price=round(random.uniform(4,180),2)
    disc=round(random.choice([0,0,0,0.05,0.1,0.15,0.2]),2)
    rev=round(units*price*(1-disc),2)
    rating=round(min(5,max(1,random.gauss(4.1,0.7))),1)
    rows.append([d.isoformat(),f"ORD-{100000+i}",region,cat,ch,units,price,disc,rev,rating])
with open("/tmp/sales.csv","w",newline="") as f:
    w=csv.writer(f)
    w.writerow(["date","order_id","region","category","channel","units","unit_price","discount","revenue","rating"])
    w.writerows(rows)
print("wrote",len(rows),"rows")
