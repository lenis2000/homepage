/*  debug.cpp
 *
 *  Random Aztec‑diamond domino tiling *and* global height function on
 *  **every** lattice vertex |x|,|y| ≤ n with |x|+|y| ≤ n+1 – no more
 *  even‑parity restriction.
 *
 *  Key idea: our previous coordinate map was scaled by a factor 2, so
 *  all vertices landed on the even sub‑lattice.  Shrinking those local
 *  patterns by ×½ (i.e. dividing the ±4,±2 displacements by 2) fills in
 *  the missing odd sites automatically.
 */

#include <iostream>
#include <vector>
#include <map>
#include <queue>
#include <utility>
#include <tuple>
#include <cmath>
#include <iomanip>
#include "aztec_sampling.h"

using MatrixInt    = std::vector<std::vector<int>>;
using MatrixDouble = std::vector<std::vector<double>>;
using Vertex       = std::pair<int,int>;
using DominoVertex = std::pair<int,int>;
struct Domino{
    std::vector<DominoVertex> coords;   // 6 vertices per domino
    std::vector<double>       relH;     // local heights
};
using HeightMap = std::map<Vertex,double>;

inline bool inDomain(int x,int y,int n){
    return std::abs(x)<=n && std::abs(y)<=n && (std::abs(x)+std::abs(y)<=n+1);
}

void printHeightGrid(const HeightMap &H,int n)
{
    for(int y=n; y>=-n; --y){
        for(int x=-n; x<=n; ++x){
            if(!inDomain(x,y,n)){ std::cout<<"   "; continue; }
            auto it=H.find({x,y});
            int h=(it==H.end())?0:static_cast<int>(std::round(it->second));
            std::cout<<std::setw(3)<<h;
        }
        std::cout<<std::endl;
    }
}

/* ------------------------------------------------------------------ */
/*  Height function                                                   */
/* ------------------------------------------------------------------ */
HeightMap calculateHeightFunction(const MatrixInt &dom,bool n0)
{
    int size=dom.size();
    int n = n0;              // just to keep signature identical
    std::vector<Domino> D;
    D.reserve(size*size/4);

    for(int i=0;i<size;++i) for(int j=0;j<size;++j){
        if(dom[i][j]!=1) continue;
        bool oi=(i&1), oj=(j&1);
        std::vector<DominoVertex> v(6);
        std::vector<double> h(6,0.0);
        int vi=j-i;                 // *** scale‑½ mapping ***
        int vj=2*n-(i+j);
        if( oi &&  oj){            // blue horizontal domino (west‑east)
            v[0]={vi   ,vj   }; h[0]=-1;
            v[1]={vi+2 ,vj   }; h[1]=-1;
            v[2]={vi+2 ,vj-1 }; h[2]=-2;
            v[3]={vi   ,vj-1 }; h[3]=-2;
            v[4]={vi+1 ,vj   }; h[4]= 0;
            v[5]={vi+1 ,vj-1 }; h[5]=-3;
        }else if( oi && !oj){      // blue vertical domino (south‑north)
            v[0]={vi   ,vj   }; h[0]=-2;
            v[1]={vi   ,vj+2 }; h[1]=-2;
            v[2]={vi+1 ,vj+2 }; h[2]=-1;
            v[3]={vi+1 ,vj   }; h[3]=-1;
            v[4]={vi   ,vj+1 }; h[4]=-3;
            v[5]={vi+1 ,vj+1 }; h[5]= 0;
        }else if(!oi && !oj){      // red horizontal domino
            v[0]={vi   ,vj   }; h[0]= 1;
            v[1]={vi+2 ,vj   }; h[1]= 1;
            v[2]={vi+2 ,vj-1 }; h[2]= 2;
            v[3]={vi   ,vj-1 }; h[3]= 2;
            v[4]={vi+1 ,vj   }; h[4]= 0;
            v[5]={vi+1 ,vj-1 }; h[5]= 3;
        }else{                    // red vertical domino
            v[0]={vi   ,vj   }; h[0]= 2;
            v[1]={vi   ,vj+2 }; h[1]= 2;
            v[2]={vi+1 ,vj+2 }; h[2]= 1;
            v[3]={vi+1 ,vj   }; h[3]= 1;
            v[4]={vi   ,vj+1 }; h[4]= 3;
            v[5]={vi+1 ,vj+1 }; h[5]= 0;
        }
        D.push_back({v,h});
    }

    int m=D.size();
    std::vector<double> off(m,0.0);
    std::vector<char>   seen(m,0);
    std::map<DominoVertex,std::vector<int>> byV;
    for(int d=0;d<m;++d) for(auto &c:D[d].coords) byV[c].push_back(d);

    std::queue<int> q;
    for(int s=0;s<m;++s){
        if(seen[s]) continue;
        seen[s]=1; off[s]=0; q.push(s);
        while(!q.empty()){
            int u=q.front(); q.pop();
            for(int k=0;k<6;++k){
                auto c=D[u].coords[k];
                for(int v:byV[c]) if(!seen[v]){
                    int l=0; while(l<6 && D[v].coords[l]!=c) ++l;
                    off[v]=off[u]+(D[u].relH[k]-D[v].relH[l]);
                    seen[v]=1; q.push(v);
                }
            }
        }
    }

    HeightMap H;
    for(int d=0;d<m;++d) for(int k=0;k<6;++k)
        H[D[d].coords[k]] = off[d] + D[d].relH[k];
    return H;
}

/* -------------------------------------------------------------------- */
/* Main program                                                         */
/* -------------------------------------------------------------------- */
int main()
{
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n=3;

    int dim = 2*n;
    MatrixDouble W(dim,std::vector<double>(dim,1.0));   // unit weights

    auto prob   = probs2(W);
    MatrixInt domino = aztecgen(prob);
    HeightMap  H     = calculateHeightFunction(domino,n);

    printHeightGrid(H,n);
    return 0;
}
